/**
 * Phase 1. 수집 — 로컬에만 저장, DB 는 건드리지 않음.
 *
 *   node scripts/migrate-jaramk/phase1-collect.ts [--static] [--boards] [--budget-mb=800] [--limit-posts=N] [--board=wwwNN]
 *
 * - 정적 페이지: 본문 HTML/텍스트/이미지 목록 → parsed/pages/<pageCode>.json, 이미지는 전부 files/static/ (예산 밖)
 * - 게시판 목록: parsed/boards/<boardID>.json
 * - 게시글: 상세(메타·첨부·댓글) + 본문 iframe → parsed/posts/<boardID>/<num>.json
 *   · 전 게시판 글번호(num) 내림차순 = 최신순으로 처리
 *   · 사진(본문 인라인 원본)은 누적 800MB 예산 안에서만 다운로드. 글 단위로 자르며, 넘치는 글은 롤백 후 그 글부터 미수집
 *   · 비이미지 첨부(hwp 등)는 예산 밖, 전부 다운로드 (files/attach/)
 *   · 미수집 글은 사진 원본 URL 목록만 JSON 에 남기고 photosCollected=false
 * - 이어받기: 페이지는 raw 캐시, 파일은 목적지 존재 여부로 건너뜀. 컷오프는 out/phase1-state.json 에 기록
 * - 세션 만료(로그인 벽) 감지 시 즉시 중단 (exit 3)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { SessionExpiredError, absoluteUrl, downloadTo, fetchHtml, hasSessionCookie, log, stats } from './lib/http.ts'
import { DATA_DIR, FILES_DIR, OUT_DIR, PARSED_DIR, ensureDirs } from './lib/paths.ts'
import { contentUrl, dateFromStoredName, listUrl, parseContentPage, parseListPage, parseViewPage, viewUrl, type Attachment, type BoardSkin, type Comment, type ListItem } from './lib/board.ts'
import { extractStaticPage, pageUrl, type StaticKind } from './lib/site.ts'

// ---------- 옵션 ----------
const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(`--${name}`)
const opt = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const DO_STATIC = flag('static') || (!flag('static') && !flag('boards'))
const DO_BOARDS = flag('boards') || (!flag('static') && !flag('boards'))
const BUDGET_BYTES = Number(opt('budget-mb') ?? '800') * 1024 * 1024
const LIMIT_POSTS = Number(opt('limit-posts') ?? '0')
const ONLY_BOARD = opt('board') ?? null

// ---------- 타입 ----------
interface InventoryPage {
  pageCode: number
  label: string | null
  titleLabel: string | null
  breadcrumb: string[]
  menuPath: string[]
  type: string
  boardID: string | null
  static?: { kind: StaticKind }
}
interface Inventory { pages: InventoryPage[] }
interface BoardsJson {
  boards: Array<{ pageCode: number; boardID: string; label: string | null; menuPath: string[]; listVisible: boolean; skin: BoardSkin; pages: number; perPage: number; total: number }>
}

export interface FileRecord {
  src: string // 원본 표기 (상대/절대)
  url: string // 절대 URL
  local: string | null // DATA_DIR 기준 상대 경로
  bytes: number | null
  ok: boolean
  reason: string | null
  lastModified?: string | null
}

export interface ParsedPage {
  pageCode: number
  label: string | null
  titleLabel: string | null
  breadcrumb: string[]
  menuPath: string[]
  kind: StaticKind
  sourceUrl: string
  contentHtml: string
  text: string
  images: FileRecord[]
  attachments: FileRecord[]
  pageMaker: ReturnType<typeof extractStaticPage>['pageMaker']
  collectedAt: string
}

export interface ParsedPost {
  boardID: string
  boardLabel: string | null
  menuPath: string[]
  skin: BoardSkin
  num: number
  title: string | null
  listTitle: string | null
  date: string | null // YYYY.MM.DD
  dateSource: 'view' | 'list' | 'stored-name' | 'last-modified' | 'interpolated' | null
  views: number | null
  bodyHtml: string
  bodyText: string
  attachmentCount: number | null
  attachments: Array<Attachment & { file: FileRecord | null }>
  photos: FileRecord[] // 본문 인라인 원본 사진 (또는 인라인이 없을 때 이미지 첨부)
  photoSource: 'inline' | 'attachment' | 'none'
  photosCollected: boolean
  photoBytes: number
  comments: Comment[]
  sourceUrls: { view: string; content: string }
  collectedAt: string
}

interface State {
  budgetBytes: number
  photoBytes: number
  photoFiles: number
  postsProcessed: number
  postsTotal: number
  photosCollectedPosts: number
  photosPendingPosts: number
  budgetExhausted: boolean
  cutoff: { num: number; boardID: string; title: string | null; date: string | null; postBytes: number } | null
  lastPost: { boardID: string; num: number } | null
  startedAt: string
  updatedAt: string
  finished: boolean
}

// ---------- 유틸 ----------
const rel = (p: string) => relative(DATA_DIR, p).replace(/\\/g, '/')
const writeJson = (p: string, v: unknown) => {
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, JSON.stringify(v, null, 2))
}
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 150)
function fileNameFromUrl(url: string): string {
  const u = new URL(url)
  return safeName(decodeURIComponent(basename(u.pathname))) || 'file'
}
const mb = (n: number) => (n / 1024 / 1024).toFixed(1)

async function grabFile(src: string, dest: string): Promise<FileRecord> {
  const url = absoluteUrl(src)
  const r = await downloadTo(url, dest)
  return { src, url, local: r.ok ? rel(dest) : null, bytes: r.ok ? r.bytes : null, ok: r.ok, reason: r.reason, lastModified: r.lastModified }
}

// ---------- 준비 ----------
ensureDirs()
const inventory = readJson<Inventory>(join(OUT_DIR, 'inventory.json'))
const boardsJson = readJson<BoardsJson>(join(OUT_DIR, 'boards.json'))
const statePath = join(OUT_DIR, 'phase1-state.json')
const prevState = existsSync(statePath) ? readJson<State>(statePath) : null

// ---------- 1) 정적 페이지 ----------
if (DO_STATIC) {
  const statics = inventory.pages.filter((p) => p.type === 'static')
  log(`정적 페이지 ${statics.length}개 수집 시작`)
  let bytes = 0
  let files = 0
  for (const p of statics) {
    const res = await fetchHtml(pageUrl(p.pageCode))
    const ex = extractStaticPage(res.html)
    const images: FileRecord[] = []
    const seenNames = new Map<string, number>()
    for (const src of ex.imageSrcs) {
      const url = absoluteUrl(src, res.finalUrl)
      let name = fileNameFromUrl(url)
      const n = (seenNames.get(name) ?? 0) + 1
      seenNames.set(name, n)
      if (n > 1) name = name.replace(/(\.\w+)?$/, `_${n}$1`)
      const rec = await grabFile(url, join(FILES_DIR, 'static', String(p.pageCode), name))
      images.push({ ...rec, src })
      if (rec.ok) {
        bytes += rec.bytes ?? 0
        files += 1
      }
    }
    const attachments: FileRecord[] = []
    for (const href of ex.attachmentHrefs) {
      const url = absoluteUrl(href, res.finalUrl)
      attachments.push(await grabFile(url, join(FILES_DIR, 'static', String(p.pageCode), 'attach', fileNameFromUrl(url))))
    }
    const parsed: ParsedPage = {
      pageCode: p.pageCode,
      label: p.label,
      titleLabel: p.titleLabel,
      breadcrumb: p.breadcrumb,
      menuPath: p.menuPath,
      kind: ex.kind,
      sourceUrl: res.url,
      contentHtml: ex.contentHtml,
      text: ex.text,
      images,
      attachments,
      pageMaker: ex.pageMaker,
      collectedAt: new Date().toISOString(),
    }
    writeJson(join(PARSED_DIR, 'pages', `${p.pageCode}.json`), parsed)
    log(`정적 pageCode=${String(p.pageCode).padStart(2)} ${ex.kind.padEnd(10)} img=${images.filter((i) => i.ok).length}/${images.length} «${p.label}»`)
  }
  log(`정적 페이지 완료: 이미지 ${files}개 ${mb(bytes)}MB`)
}

// ---------- 2) 게시판 목록 ----------
interface GlobalItem extends ListItem {
  boardID: string
  boardLabel: string | null
  menuPath: string[]
  skin: BoardSkin
}

if (DO_BOARDS) {
  if (!hasSessionCookie()) {
    console.error('실패: 게시판 수집에는 로그인 쿠키(.env.local)가 필요합니다.')
    process.exit(1)
  }
  const all: GlobalItem[] = []
  const boards = boardsJson.boards.filter((b) => b.listVisible && (!ONLY_BOARD || b.boardID === ONLY_BOARD))
  for (const b of boards) {
    const items = new Map<number, ListItem>()
    let pages = b.pages
    let skin: BoardSkin = b.skin
    for (let page = 1; page <= pages; page += 1) {
      const res = await fetchHtml(page === 1 ? pageUrl(b.pageCode) : listUrl(b.boardID, page))
      if (res.loginWall) throw new SessionExpiredError(res.url, res.loginWall)
      const parsed = parseListPage(res.html, page)
      if (parsed.skin !== 'unknown') skin = parsed.skin
      for (const it of parsed.items) if (!items.has(it.num)) items.set(it.num, it)
      if (parsed.maxPageSeen > pages) pages = parsed.maxPageSeen
    }
    const list = [...items.values()].sort((a, c) => c.num - a.num)
    writeJson(join(PARSED_DIR, 'boards', `${b.boardID}.json`), { boardID: b.boardID, pageCode: b.pageCode, label: b.label, menuPath: b.menuPath, skin, pages, items: list, collectedAt: new Date().toISOString() })
    log(`목록 ${b.boardID} «${b.label}» ${pages}p → ${list.length}건 (예상 ${b.total})`)
    for (const it of list) all.push({ ...it, boardID: b.boardID, boardLabel: b.label, menuPath: b.menuPath, skin })
  }
  all.sort((a, c) => c.num - a.num)
  const targets = LIMIT_POSTS > 0 ? all.slice(0, LIMIT_POSTS) : all

  // ---------- 3) 게시글 (num 내림차순) ----------
  const state: State = {
    budgetBytes: BUDGET_BYTES,
    photoBytes: 0,
    photoFiles: 0,
    postsProcessed: 0,
    postsTotal: targets.length,
    photosCollectedPosts: 0,
    photosPendingPosts: 0,
    budgetExhausted: false,
    cutoff: null,
    lastPost: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finished: false,
  }
  // 같은 예산으로 재실행이면 이전 컷오프를 존중 (컷오프 글의 사진을 또 받았다 지우는 낭비 방지)
  const priorCutoffNum = prevState && prevState.budgetBytes === BUDGET_BYTES && prevState.cutoff ? prevState.cutoff.num : null
  const saveState = () => {
    state.updatedAt = new Date().toISOString()
    writeJson(statePath, state)
  }

  log(`게시글 ${targets.length}건 수집 시작 (사진 예산 ${mb(BUDGET_BYTES)}MB${priorCutoffNum ? `, 이전 컷오프 num=${priorCutoffNum}` : ''})`)
  let idx = 0
  try {
    for (const it of targets) {
      idx += 1
      const view = await fetchHtml(viewUrl(it.boardID, it.num))
      if (view.loginWall) throw new SessionExpiredError(view.url, view.loginWall)
      const content = await fetchHtml(contentUrl(it.boardID, it.num))
      if (content.loginWall) throw new SessionExpiredError(content.url, content.loginWall)
      const vp = parseViewPage(view.html)
      const cp = parseContentPage(content.html)

      // 사진 후보: 본문 인라인 이미지 (원본). 없으면 이미지 첨부를 사진으로 취급.
      const inlinePhotos = cp.imageSrcs.map((src) => ({ src, url: absoluteUrl(src, content.finalUrl) })).filter((p) => !/\/core\//.test(p.url))
      const imageAttachments = vp.attachments.filter((a) => a.isImage)
      const nonImageAttachments = vp.attachments.filter((a) => !a.isImage)
      const photoSource: ParsedPost['photoSource'] = inlinePhotos.length ? 'inline' : imageAttachments.length ? 'attachment' : 'none'
      const photoDir = join(FILES_DIR, 'board', it.boardID, String(it.num))
      const photoPlan: Array<{ src: string; url: string; dest: string }> =
        photoSource === 'inline'
          ? inlinePhotos.map((p) => ({ ...p, dest: join(photoDir, fileNameFromUrl(p.url)) }))
          : imageAttachments.map((a) => ({ src: `download.php#${a.fileNum}`, url: absoluteUrl(`/core/anyboard/download.php?boardID=${it.boardID}&fileNum=${a.fileNum}`), dest: join(photoDir, `${a.fileNum}_${safeName(a.name)}`) }))

      // 비이미지 첨부: 예산 밖, 전부
      const attachments: ParsedPost['attachments'] = []
      for (const a of vp.attachments) {
        if (a.isImage) {
          attachments.push({ ...a, file: null }) // 사진으로 취급 (photos 에 기록)
          continue
        }
        const file = await grabFile(`/core/anyboard/download.php?boardID=${it.boardID}&fileNum=${a.fileNum}`, join(FILES_DIR, 'attach', it.boardID, String(it.num), `${a.fileNum}_${safeName(a.name) || 'file'}`))
        attachments.push({ ...a, file })
      }

      // 사진 다운로드 (예산)
      let photos: FileRecord[] = []
      let photoBytes = 0
      let photosCollected = false
      const skipByPriorCutoff = priorCutoffNum !== null && it.num <= priorCutoffNum
      if (!state.budgetExhausted && !skipByPriorCutoff && photoPlan.length > 0) {
        for (const p of photoPlan) {
          const rec = await grabFile(p.url, p.dest)
          photos.push({ ...rec, src: p.src })
          if (rec.ok) photoBytes += rec.bytes ?? 0
        }
        if (state.photoBytes + photoBytes > BUDGET_BYTES) {
          // 글 단위 컷: 이 글의 사진을 전부 지우고 여기서부터 미수집
          rmSync(photoDir, { recursive: true, force: true })
          photos = photoPlan.map((p) => ({ src: p.src, url: p.url, local: null, bytes: null, ok: false, reason: 'budget-cutoff' }))
          state.budgetExhausted = true
          state.cutoff = { num: it.num, boardID: it.boardID, title: vp.title ?? it.title, date: vp.date ?? it.date, postBytes: photoBytes }
          photoBytes = 0
          log(`■ 사진 예산 도달: ${it.boardID} #${it.num} «${vp.title ?? it.title}» 이 글(${mb(state.cutoff.postBytes)}MB)부터 미수집. 누적 ${mb(state.photoBytes)}MB`)
        } else {
          photosCollected = photos.length > 0 && photos.every((p) => p.ok)
          state.photoBytes += photoBytes
          state.photoFiles += photos.filter((p) => p.ok).length
        }
      } else {
        if (skipByPriorCutoff && !state.budgetExhausted) {
          state.budgetExhausted = true
          state.cutoff = prevState?.cutoff ?? null
        }
        photos = photoPlan.map((p) => ({ src: p.src, url: p.url, local: null, bytes: null, ok: false, reason: photoPlan.length ? 'budget-cutoff' : null }))
      }
      if (photoPlan.length === 0) photosCollected = true // 사진이 없는 글은 "수집 완료"로 본다

      // 날짜: 상세 등록일 → 목록 등록일 → 저장 파일명 타임스탬프 → 첨부 Last-Modified → (리포트 단계에서 근사)
      let date: string | null = vp.date
      let dateSource: ParsedPost['dateSource'] = vp.date ? 'view' : null
      if (!date && it.date) {
        date = it.date
        dateSource = 'list'
      }
      if (!date) {
        const fromName = inlinePhotos.map((p) => dateFromStoredName(p.url)).find((d): d is string => !!d)
        if (fromName) {
          date = fromName
          dateSource = 'stored-name'
        }
      }
      if (!date) {
        const lm = attachments.map((a) => a.file?.lastModified).find((d): d is string => !!d)
        if (lm && !Number.isNaN(Date.parse(lm))) {
          const d = new Date(Date.parse(lm) + 9 * 3600 * 1000)
          date = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
          dateSource = 'last-modified'
        }
      }

      const post: ParsedPost = {
        boardID: it.boardID,
        boardLabel: it.boardLabel,
        menuPath: it.menuPath,
        skin: it.skin,
        num: it.num,
        title: vp.title ?? it.title,
        listTitle: it.title,
        date,
        dateSource,
        views: vp.views ?? it.views,
        bodyHtml: cp.bodyHtml,
        bodyText: cp.bodyText,
        attachmentCount: vp.attachmentCount,
        attachments,
        photos,
        photoSource,
        photosCollected,
        photoBytes,
        comments: vp.comments,
        sourceUrls: { view: view.url, content: content.url },
        collectedAt: new Date().toISOString(),
      }
      writeJson(join(PARSED_DIR, 'posts', it.boardID, `${it.num}.json`), post)

      state.postsProcessed = idx
      state.lastPost = { boardID: it.boardID, num: it.num }
      if (photosCollected && photoPlan.length > 0) state.photosCollectedPosts += 1
      if (!photosCollected) state.photosPendingPosts += 1
      saveState()
      log(
        `[${String(idx).padStart(4)}/${targets.length}] ${it.boardID.padEnd(6)} #${it.num} ${date ?? '----.--.--'} ${photosCollected ? '📷' : (photoPlan.length ? '⏸' : '  ')} ${String(photos.filter((p) => p.ok).length).padStart(2)}/${String(photoPlan.length).padEnd(2)} 첨부${nonImageAttachments.length} 누적 ${mb(state.photoBytes)}MB «${(vp.title ?? it.title).slice(0, 30)}»`
      )
    }
    state.finished = true
    saveState()
  } catch (err) {
    saveState()
    if (err instanceof SessionExpiredError) {
      log(`■ 중단: ${err.message}`)
      log('  → 브라우저에서 다시 로그인해 .env.local 의 PHPSESSID 를 갱신한 뒤 같은 명령으로 재실행하면 이어서 진행됩니다.')
      process.exit(3)
    }
    throw err
  }
}

log(`요청 통계: network=${stats.network} cached=${stats.cached} failed=${stats.failed} loginWalls=${stats.loginWalls} 전송 ${mb(stats.bytes)}MB`)
