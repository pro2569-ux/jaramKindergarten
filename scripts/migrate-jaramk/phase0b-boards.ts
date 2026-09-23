/**
 * Phase 0b. 로그인 쿠키로 게시판별 목록 1페이지 + 마지막 페이지를 읽어 정확한 글 수/페이지네이션 확인
 *   → data/out/boards.json
 *
 *   node scripts/migrate-jaramk/phase0b-boards.ts
 *
 * 요청: 게시판당 1페이지(대부분 캐시) + 마지막 페이지 1회 (+ 페이징 블록이 더 있으면 추가).
 * 목록이 안 보이는(로그인 벽) 게시판이 있으면 기록만 하고 계속 진행한 뒤 마지막에 표시한다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchHtml, hasSessionCookie, log, stats } from './lib/http.ts'
import { OUT_DIR, ensureDirs } from './lib/paths.ts'
import { listUrl, parseListPage, type BoardSkin } from './lib/board.ts'
import { pageUrl } from './lib/site.ts'

interface InventoryBoard {
  pageCode: number
  boardID: string
  label: string | null
  menuPath: string[]
}

export interface BoardSummary {
  pageCode: number
  boardID: string
  label: string | null
  menuPath: string[]
  listVisible: boolean
  loginWall: string | null
  skin: BoardSkin
  perPage: number
  pages: number
  total: number
  firstOrdinal: number | null // list 스킨: 1페이지 첫 행 번호 (= 전체 글 수 교차검증)
  newestDate: string | null
  oldestDate: string | null
  numRange: [number, number] | null
  noticeCount: number
  page1FileCount: number // list 스킨 1페이지에서 보이는 첨부 수 (첨부 밀도 가늠용)
  sampleTitles: string[]
}

ensureDirs()
if (!hasSessionCookie()) {
  console.error('실패: .env.local 에 로그인 쿠키(JARAMK_COOKIE 또는 PHPSESSID)가 없습니다.')
  process.exit(1)
}

const inventoryPath = join(OUT_DIR, 'inventory.json')
if (!existsSync(inventoryPath)) {
  console.error(`실패: ${inventoryPath} 가 없습니다. phase0-inventory.ts 를 먼저 실행하세요.`)
  process.exit(1)
}
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as { boards: InventoryBoard[] }
const boards = inventory.boards.map((b) => ({ ...b, boardID: b.boardID.replace(/\s*\(추정\)$/, '') }))

const results: BoardSummary[] = []
for (const b of boards) {
  const first = await fetchHtml(pageUrl(b.pageCode))
  if (first.loginWall) {
    log(`🔒 ${b.boardID} «${b.label}» 목록 안 보임: ${first.loginWall}`)
    results.push({
      pageCode: b.pageCode, boardID: b.boardID, label: b.label, menuPath: b.menuPath,
      listVisible: false, loginWall: first.loginWall, skin: 'unknown', perPage: 0, pages: 0, total: 0,
      firstOrdinal: null, newestDate: null, oldestDate: null, numRange: null, noticeCount: 0, page1FileCount: 0, sampleTitles: [],
    })
    continue
  }
  const p1 = parseListPage(first.html, 1)
  const boardID = p1.boardID ?? b.boardID
  const perPage = p1.items.length

  // 마지막 페이지 찾기: 페이징 블록의 최대 page 로 이동, 거기서 더 큰 page 가 보이면 반복
  let last = p1.maxPageSeen
  let lastItems = p1.items
  let guard = 0
  while (last > 1 && guard < 50) {
    guard += 1
    const res = await fetchHtml(listUrl(boardID, last))
    if (res.loginWall) {
      log(`🔒 ${boardID} page=${last} 로그인 벽: ${res.loginWall}`)
      break
    }
    const parsed = parseListPage(res.html, last)
    lastItems = parsed.items
    if (parsed.maxPageSeen > last) {
      last = parsed.maxPageSeen
      continue
    }
    break
  }

  const total = last <= 1 ? perPage : (last - 1) * perPage + lastItems.length
  const allSeen = [...p1.items, ...lastItems]
  const nums = allSeen.map((i) => i.num)
  const dates = allSeen.map((i) => i.date).filter((d): d is string => !!d).sort()
  const summary: BoardSummary = {
    pageCode: b.pageCode,
    boardID,
    label: b.label,
    menuPath: b.menuPath,
    listVisible: true,
    loginWall: null,
    skin: p1.skin,
    perPage,
    pages: last,
    total,
    firstOrdinal: p1.items.find((i) => i.ordinal !== null)?.ordinal ?? null,
    newestDate: dates.length ? dates[dates.length - 1]! : null,
    oldestDate: dates.length ? dates[0]! : null,
    numRange: nums.length ? [Math.min(...nums), Math.max(...nums)] : null,
    noticeCount: p1.items.filter((i) => i.isNotice).length,
    page1FileCount: p1.items.reduce((n, i) => n + i.fileNums.length, 0),
    sampleTitles: p1.items.slice(0, 3).map((i) => i.title),
  }
  results.push(summary)
  log(
    `${boardID.padEnd(6)} «${b.label}» ${p1.skin} ${perPage}/page × ${last}p = ${total}건` +
      (summary.firstOrdinal !== null ? ` (첫 행 번호 ${summary.firstOrdinal})` : '') +
      (summary.newestDate ? ` ${summary.oldestDate}~${summary.newestDate}` : '')
  )
}

const totals = {
  boards: results.length,
  visible: results.filter((r) => r.listVisible).length,
  hidden: results.filter((r) => !r.listVisible).map((r) => r.boardID),
  posts: results.reduce((n, r) => n + r.total, 0),
  listPages: results.reduce((n, r) => n + r.pages, 0),
  photoPosts: results.filter((r) => r.skin === 'photo').reduce((n, r) => n + r.total, 0),
  listPosts: results.filter((r) => r.skin === 'list').reduce((n, r) => n + r.total, 0),
}
const out = { generatedAt: new Date().toISOString(), totals, boards: results, requestStats: { ...stats } }
writeFileSync(join(OUT_DIR, 'boards.json'), JSON.stringify(out, null, 2))
log(`boards.json 저장: ${join(OUT_DIR, 'boards.json')}`)

console.log('\n=== 게시판별 글 수 ===')
console.log('boardID  pageCode  스킨    /page  페이지  글수   첫행번호  기간                    라벨')
for (const r of results) {
  if (!r.listVisible) {
    console.log(`${r.boardID.padEnd(8)} ${String(r.pageCode).padEnd(9)} 🔒 목록 안 보임 (${r.loginWall})  «${r.label}»`)
    continue
  }
  const period = r.newestDate ? `${r.oldestDate}~${r.newestDate}` : '(목록에 날짜 없음)'
  console.log(
    `${r.boardID.padEnd(8)} ${String(r.pageCode).padEnd(9)} ${r.skin.padEnd(6)} ${String(r.perPage).padStart(4)}   ${String(r.pages).padStart(4)}   ${String(r.total).padStart(5)}  ${String(r.firstOrdinal ?? '-').padStart(6)}   ${period.padEnd(23)} «${r.label}» ${r.menuPath.join(' > ')}`
  )
}
console.log('\n=== 합계 ===')
console.log(JSON.stringify(totals, null, 2))
log(`요청 통계: network=${stats.network} cached=${stats.cached} failed=${stats.failed} loginWalls=${stats.loginWalls}`)
