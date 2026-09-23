/**
 * Phase 0. 구조 조사 — 메뉴 트리 + 페이지 분류 + 게시판/로그인 여부 → data/out/inventory.json
 *
 *   node scripts/migrate-jaramk/phase0-inventory.ts
 *
 * 요청은 발견된 pageCode 당 1회 (캐시되면 0회). 게시판 글 수는 로그인 쿠키(JARAMK_COOKIE)가 있을 때만 셀 수 있다.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchHtml, log, stats } from './lib/http.ts'
import { OUT_DIR, ensureDirs } from './lib/paths.ts'
import {
  analyzeStaticContent,
  classifyPage,
  collectPageLinks,
  mergeMenuTrees,
  pageUrl,
  parseTitleNavi,
  parseTopMenu,
  type MenuNode,
  type PageInfo,
} from './lib/site.ts'

const MAIN_URL = '/main/main.html'
const EXTRA_CATEGORY_PROBES = [4] // 상단 메뉴에 없는 mstrCode (숨은 대분류) 확인용
const REQUEST_INTERVAL_SEC = 1.5

ensureDirs()

// 1) 메인 페이지 → 상단 메뉴 트리 + 퀵링크
const main = await fetchHtml(MAIN_URL)
let menu: MenuNode[] = parseTopMenu(main.html)
const discovered = new Map<number, string>() // pageCode → label
for (const [code, label] of collectPageLinks(main.html)) discovered.set(code, label)
log(`메인: 대분류 ${menu.length}개, pageCode 링크 ${discovered.size}개`)

// 2) 숨은 대분류 프로브 (해당 섹션에 들어가야 서브메뉴가 노출됨)
for (const mstrCode of EXTRA_CATEGORY_PROBES) {
  const res = await fetchHtml(`/main/sub.html?mstrCode=${mstrCode}`)
  menu = mergeMenuTrees(menu, parseTopMenu(res.html))
  for (const [code, label] of collectPageLinks(res.html)) if (!discovered.has(code)) discovered.set(code, label)
  log(`mstrCode=${mstrCode}: final=${res.finalUrl} → 누적 pageCode ${discovered.size}개`)
}

// 3) 발견된 모든 pageCode 를 1회씩 방문해 분류 (방문 중 새로 발견된 pageCode 도 큐에 추가)
const pages = new Map<number, PageInfo>()
const queue = [...discovered.keys()].sort((a, b) => a - b)
while (queue.length > 0) {
  const code = queue.shift()!
  if (pages.has(code)) continue
  const res = await fetchHtml(pageUrl(code))
  const cls = classifyPage(res.html)
  const { titleLabel, breadcrumb } = parseTitleNavi(res.html)
  const info: PageInfo = {
    pageCode: code,
    url: res.url,
    label: discovered.get(code) ?? null,
    titleLabel,
    breadcrumb,
    ...cls,
    charset: res.charset,
    bytes: res.bytes,
  }
  if (cls.type === 'static') info.static = analyzeStaticContent(res.html)
  pages.set(code, info)

  menu = mergeMenuTrees(menu, parseTopMenu(res.html))
  for (const [c, label] of collectPageLinks(res.html)) {
    if (!discovered.has(c)) {
      discovered.set(c, label)
      queue.push(c)
      log(`  새 pageCode 발견: ${c} «${label}» (from pageCode=${code})`)
    }
  }
  const kind = info.static ? `:${info.static.kind}` : cls.redirectTo !== null ? `→${cls.redirectTo}` : ''
  log(
    `pageCode=${String(code).padStart(2)} ${(cls.type + kind).padEnd(18)} ${cls.boardID ?? ''} ${cls.loginRequired ? '🔒' : '  '} «${info.label ?? titleLabel ?? ''}» ${res.charset} ${res.fromCache ? '(cache)' : ''}`
  )
}

// 4) 집계
const list = [...pages.values()].sort((a, b) => a.pageCode - b.pageCode)
const boards = list.filter((p) => p.type === 'board')
const statics = list.filter((p) => p.type === 'static')
const loginSections = list.filter((p) => p.type === 'login-section')

function menuPathOf(code: number): string[] {
  for (const cat of menu) {
    for (const mid of cat.children) {
      if (mid.pageCode === code) return [cat.label, mid.label]
      for (const leaf of mid.children) if (leaf.pageCode === code) return [cat.label, mid.label, leaf.label]
    }
  }
  return []
}

// 4-1) 상단 메뉴에 없는 숨은 대분류를 breadcrumb 에서 복원 (예: 교육활동이야기 > 자람반)
for (const p of list) {
  if (menuPathOf(p.pageCode).length > 0 || p.breadcrumb.length < 2) continue
  const [catLabel, ...rest] = p.breadcrumb
  let cat = menu.find((c) => c.label === catLabel)
  if (!cat) {
    cat = { label: catLabel!, pageCode: null, mstrCode: EXTRA_CATEGORY_PROBES[0] ?? null, url: '(breadcrumb 에서 복원)', children: [] }
    menu.push(cat)
  }
  cat.children.push({ label: rest[rest.length - 1] ?? p.label ?? '', pageCode: p.pageCode, mstrCode: cat.mstrCode, url: pageUrl(p.pageCode), children: [] })
}
menu.sort((a, b) => (a.mstrCode ?? 0) - (b.mstrCode ?? 0))

const staticKinds = statics.reduce<Record<string, number>>((acc, p) => {
  const k = p.static?.kind ?? 'unknown'
  acc[k] = (acc[k] ?? 0) + 1
  return acc
}, {})
const staticImages = statics.reduce((n, p) => n + (p.static?.imageCount ?? 0), 0)
const staticAttachments = statics.reduce((n, p) => n + (p.static?.attachmentUrls.length ?? 0), 0)

// 4-2) 요청 수/시간 추정
const maxPostNumSeen = 1712 // 메인 페이지 최신글 번호 (num 은 게시판 공통 전역 일련번호로 보임 → 전체 글 수 상한)
const estimate = {
  assumptions: [
    `요청 간격 ${REQUEST_INTERVAL_SEC}s, 동시 1개`,
    '정적 페이지 HTML 은 Phase 0 에서 이미 캐시됨 (추가 요청 0)',
    `게시글 num 이 게시판 공통 일련번호(www27: 1708~1712, www35: 1686~1693 교차)로 보여 전체 글 수 상한 ≈ ${maxPostNumSeen}`,
    '게시판 목록 페이지당 글 수·글당 첨부/사진 수는 로그인 후 확인 필요 (아래는 가정치)',
  ],
  staticImageRequests: staticImages + staticAttachments,
  staticMinutes: Math.ceil(((staticImages + staticAttachments) * REQUEST_INTERVAL_SEC) / 60),
  boards: {
    count: boards.length + loginSections.length,
    postUpperBound: maxPostNumSeen,
    listPagesGuess: Math.ceil(maxPostNumSeen / 15),
    pageRequestsUpperBound: maxPostNumSeen + Math.ceil(maxPostNumSeen / 15),
    filesGuessRange: [maxPostNumSeen * 2, maxPostNumSeen * 8],
    minutesRange: [
      Math.ceil(((maxPostNumSeen + Math.ceil(maxPostNumSeen / 15) + maxPostNumSeen * 2) * REQUEST_INTERVAL_SEC) / 60),
      Math.ceil(((maxPostNumSeen + Math.ceil(maxPostNumSeen / 15) + maxPostNumSeen * 8) * REQUEST_INTERVAL_SEC) / 60),
    ],
  },
}

const inventory = {
  generatedAt: new Date().toISOString(),
  site: 'http://jaramk.com',
  robotsTxt: 'User-agent: * → Disallow: / (네이버/구글/다음 봇만 허용). 사이트 소유자의 콘텐츠 이관 목적으로 GET 만, 1.5s 간격.',
  urlPatterns: {
    category: '/main/sub.html?mstrCode=<n>',
    page: '/main/sub.html?pageCode=<n>',
    boardList: '/main/sub.html?pageCode=<n>  (anyboard boardID=www<n>; 페이지네이션은 로그인 후 확인)',
    postView: '/main/sub.html?boardID=www<n>&num=<글번호>&Mode=view',
    boardAttachment: '/user/saveDir/board/www<n>/<num>_<timestamp>_<idx>[_thum].<ext>',
    staticRichtextImage: '/user/saveDir/contents/<id>_<n>.jpg',
    staticPageMakerImage: '/user/saveDir/contents/<pageCode>/page_anyImage_<id>.png?itemTime=<ts>',
    fontImageLabel: '/core/fonts/text.html?...&text=<base64 UTF-8>',
  },
  encoding: {
    responseHeader: 'text/html; charset=UTF-8',
    observed: Object.fromEntries(list.map((p) => [p.pageCode, p.charset])),
    note: 'UTF-8 엄격 디코드 실패 시 EUC-KR 로 폴백하는 로직 적용. 조사한 페이지는 전부 UTF-8 (observed 참고). 게시글 본문은 로그인 후 재확인.',
  },
  menuTree: menu,
  pages: list.map((p) => ({ ...p, menuPath: menuPathOf(p.pageCode) })),
  summary: {
    totalPages: list.length,
    staticPages: statics.length,
    staticKinds,
    boards: boards.length,
    boardsLoginRequired: boards.filter((b) => b.loginRequired).length,
    loginSections: loginSections.length,
    redirects: list.filter((p) => p.type === 'redirect').length,
    missing: list.filter((p) => p.type === 'missing').length,
    unknown: list.filter((p) => p.type === 'unknown').length,
    staticImages,
    staticAttachments,
    staticTables: statics.reduce((n, p) => n + (p.static?.tableCount ?? 0), 0),
  },
  boards: [...boards, ...loginSections].map((b) => ({
    pageCode: b.pageCode,
    boardID: b.boardID ?? `www${b.pageCode} (추정)`,
    label: b.label ?? b.titleLabel,
    menuPath: menuPathOf(b.pageCode),
    type: b.type,
    loginRequired: b.loginRequired,
    loginMessage: b.loginMessage,
    postCount: null as number | null, // 로그인 쿠키 확보 후 Phase 0b 에서 채움
  })),
  estimate,
  requestStats: { ...stats },
}

writeFileSync(join(OUT_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2))
log(`inventory.json 저장: ${join(OUT_DIR, 'inventory.json')}`)

// 5) 콘솔 요약
const tag = (p?: PageInfo) =>
  p ? `${p.type}${p.static ? ':' + p.static.kind : ''}${p.boardID ? ':' + p.boardID : ''}${p.redirectTo !== null ? '→' + p.redirectTo : ''}${p.loginRequired ? ' 🔒' : ''}` : ''
console.log('\n=== 메뉴 트리 ===')
for (const cat of menu) {
  console.log(`[${cat.mstrCode}] ${cat.label}${cat.url.includes('복원') ? ' (숨은 대분류, breadcrumb 복원)' : ''}`)
  for (const mid of cat.children) {
    console.log(`  ├ ${mid.label} (pageCode=${mid.pageCode}) ${tag(mid.pageCode !== null ? pages.get(mid.pageCode) : undefined)}`)
    for (const leaf of mid.children) {
      console.log(`  │   └ ${leaf.label} (pageCode=${leaf.pageCode}) ${tag(leaf.pageCode !== null ? pages.get(leaf.pageCode) : undefined)}`)
    }
  }
}
const orphans = list.filter((p) => menuPathOf(p.pageCode).length === 0)
if (orphans.length) {
  console.log('\n=== 메뉴 트리 밖 페이지 (퀵링크 등) ===')
  for (const p of orphans) console.log(`  pageCode=${p.pageCode} ${tag(p)} «${p.label ?? p.titleLabel ?? ''}»`)
}
console.log('\n=== 정적 페이지 ===')
for (const p of statics) {
  const s = p.static!
  const pm = s.pageMaker ? ` pagemaker(${s.pageMaker.width}x${s.pageMaker.height}, items=${s.pageMaker.items}, left≠0: ${s.pageMaker.leftOffsets.length})` : ''
  console.log(`  ${String(p.pageCode).padStart(2)} ${(p.label ?? '').padEnd(20)} ${s.kind.padEnd(9)} img=${String(s.imageCount).padStart(3)} text=${String(s.textLength).padStart(5)} tables=${s.tableCount}${pm}`)
}
console.log('\n=== 요약 ===')
console.log(JSON.stringify(inventory.summary, null, 2))
console.log('\n=== 게시판 ===')
for (const b of inventory.boards) console.log(`  ${b.boardID.padEnd(14)} pageCode=${String(b.pageCode).padEnd(3)} «${b.label}» ${b.menuPath.join(' > ')} ${b.loginRequired ? '🔒 ' + b.loginMessage : '공개'}`)
console.log('\n=== 추정 ===')
console.log(JSON.stringify(inventory.estimate, null, 2))
log(`요청 통계: network=${stats.network} cached=${stats.cached} failed=${stats.failed}`)
