/**
 * Phase 2. 변환 — parsed/ → transformed/ (DB 에 넣기 직전 형태). DB/Storage 는 건드리지 않음.
 *   node scripts/migrate-jaramk/phase2-transform.ts
 *
 * - 본문 HTML: 프로젝트의 lib/sanitize.ts (sanitize-html allowlist) 를 그대로 적용해 script/iframe/on* 제거, 표 유지
 * - 정리: 빈 <p>&nbsp;</p> 연속 축소, 이미지의 border-image/currentColor 같은 무의미한 인라인 스타일 제거,
 *   에디터 잔재 속성(id=ANYBOARDVIEWIMAGE_*, orgwidth 등)은 allowlist 에 없어 자동 제거
 * - 이미지 src: url-map.json 으로 로컬 파일과 매칭되면 '/__legacy_media__/<로컬경로>' 토큰으로 치환.
 *   Phase 3 에서 Storage 업로드 후 실제 URL 로 바꾼다. 매칭 안 되는(미수집) 이미지는 본문에서 제거하고 URL 만 기록.
 * - 결과에 'jaramk.com' 이 한 글자라도 남으면 리포트에 잡힌다 (0 이어야 함).
 * - pageMaker 페이지(결정 c): 이미지들을 top/left 순으로 세로로 쌓은 최소 HTML + 원본 좌표를 legacy 메타로 보존
 * - 동영상 첨부는 제외(로컬 보관만), hwp 는 포함. 댓글은 변환하지 않음.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as cheerio from 'cheerio'
import { sanitizeHtml } from '../../lib/sanitize.ts'
import { DATA_DIR, OUT_DIR, PARSED_DIR } from './lib/paths.ts'
import type { FileRecord, ParsedPage, ParsedPost } from './phase1-collect.ts'

export const MEDIA_TOKEN_PREFIX = '/__legacy_media__/'
const TRANSFORMED_DIR = join(DATA_DIR, 'transformed')
const VIDEO_EXT = /\.(?:mp4|wmv|avi|mov|mkv|m4v|flv)$/i
const SITE_HOST_RE = /jaramk\.com/i

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const writeJson = (p: string, v: unknown) => {
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, JSON.stringify(v, null, 2))
}
const listJson = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [])

const urlMap = readJson<Record<string, string>>(join(OUT_DIR, 'url-map.json'))

// ---------- 정적 페이지 → pages 매핑 (slug/category 제안) ----------
// slug 는 기존 시드(greeting/philosophy/environment/facilities/standard/nuri/forest)와 맞추고 나머지는 새로 정함.
// 기존 행을 덮어쓰지 않도록 Phase 3 에서는 'legacy-' 접두어를 붙여 넣는 것을 기본안으로 한다.
const PAGE_MAP: Record<number, { slug: string; category: string; group?: { slug: string; label: string } }> = {
  1: { slug: 'greeting', category: 'about' },
  2: { slug: 'philosophy', category: 'about' },
  66: { slug: 'teachers', category: 'about' },
  4: { slug: 'environment', category: 'about' },
  5: { slug: 'facilities', category: 'about' },
  67: { slug: 'location', category: 'about' },
  65: { slug: 'standard', category: 'curriculum' },
  8: { slug: 'nuri', category: 'curriculum' },
  62: { slug: 'forest', category: 'curriculum', group: { slug: 'nature', label: '자연주의 유아교육 프로그램' } },
  58: { slug: 'farm', category: 'curriculum', group: { slug: 'nature', label: '자연주의 유아교육 프로그램' } },
  52: { slug: 'fitness', category: 'curriculum', group: { slug: 'nature', label: '자연주의 유아교육 프로그램' } },
  56: { slug: 'seasonal-customs', category: 'curriculum', group: { slug: 'nature', label: '자연주의 유아교육 프로그램' } },
  57: { slug: 'outdoor-walk', category: 'curriculum', group: { slug: 'nature', label: '자연주의 유아교육 프로그램' } },
  63: { slug: 'reading-coaching', category: 'curriculum', group: { slug: 'special-programs', label: '특색프로그램' } },
  32: { slug: 'happy-project', category: 'curriculum', group: { slug: 'special-programs', label: '특색프로그램' } },
  31: { slug: 'nasa-creca', category: 'curriculum', group: { slug: 'special-programs', label: '특색프로그램' } },
  60: { slug: 'creative-tools', category: 'curriculum', group: { slug: 'special-programs', label: '특색프로그램' } },
  61: { slug: 'parents-storytelling', category: 'curriculum', group: { slug: 'special-programs', label: '특색프로그램' } },
  10: { slug: 'special-activities', category: 'curriculum' },
  11: { slug: 'events', category: 'curriculum' },
  47: { slug: 'adaptation-guide', category: 'admission' },
}

// ---------- 게시판 → 대상 테이블 매핑 ----------
const BOARD_MAP: Record<string, { target: 'albums' | 'posts'; boardType?: string; category: string }> = {
  www16: { target: 'albums', category: '자람반' },
  www18: { target: 'albums', category: '산새반' },
  www19: { target: 'albums', category: '라온반' },
  www22: { target: 'albums', category: '맑은반' },
  www23: { target: 'albums', category: '햇살반' },
  www51: { target: 'albums', category: '샘물반' },
  www43: { target: 'albums', category: '숲속반' },
  www35: { target: 'albums', category: '자람이야기' },
  www27: { target: 'posts', boardType: 'newsletter', category: '교육자료실' }, // A안: 기존 타입에 매핑 (B안: 'archive' 신설)
  www49: { target: 'posts', boardType: 'notice', category: '입소신청서' },
}

// ---------- HTML 변환 ----------
interface HtmlResult {
  html: string
  mediaTokens: string[] // 본문에서 참조하는 로컬 파일 (토큰 순서)
  removedImages: string[] // 로컬 파일이 없어 제거한 이미지 URL
  removedLinks: string[]
  residue: string[] // jaramk.com 이 남은 조각 (0 이어야 함)
}

function cleanupAndTokenize(rawHtml: string, baseUrl: string, allowedLocal: Set<string> | null): HtmlResult {
  const $ = cheerio.load(rawHtml, null, false)
  const mediaTokens: string[] = []
  const removedImages: string[] = []
  const removedLinks: string[] = []

  $('script, iframe, object, embed, form, style, noscript').remove()

  $('img').each((_, el) => {
    const img = $(el)
    const src = img.attr('src') ?? ''
    if (/^data:/i.test(src)) {
      // 인라인 data: URI (교육자료실 글 3건의 작은 이모티콘) — 새니타이저가 어차피 막으므로 제거하고 기록
      removedImages.push(`data:(${src.length} chars)`)
      img.remove()
      return
    }
    let abs = ''
    try {
      abs = new URL(src, baseUrl).toString()
    } catch {
      abs = src
    }
    const local = urlMap[abs]
    if (local && (!allowedLocal || allowedLocal.has(local))) {
      img.attr('src', MEDIA_TOKEN_PREFIX + local)
      mediaTokens.push(local)
      // 에디터 잔재 정리
      const style = (img.attr('style') ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !/^border(-image)?\s*:\s*(currentColor|none)/i.test(s))
        .join('; ')
      if (style) img.attr('style', style)
      else img.removeAttr('style')
      for (const a of ['id', 'orgwidth', 'orgheight', 'onclick', 'onload']) img.removeAttr(a)
    } else {
      removedImages.push(abs)
      // 이미지만 있던 래퍼(<div align=center>)가 비면 같이 제거
      const parent = img.parent()
      img.remove()
      if (parent.length && !parent.text().trim() && parent.children().length === 0) parent.remove()
    }
  })

  $('a[href]').each((_, el) => {
    const a = $(el)
    const href = a.attr('href') ?? ''
    if (/^javascript:/i.test(href) || SITE_HOST_RE.test(href) || href.startsWith('/') || href.startsWith('../')) {
      removedLinks.push(href)
      a.replaceWith(a.html() ?? '')
    }
  })

  // 빈 문단 연속 축소: <p>&nbsp;</p> 가 2개 이상 이어지면 1개만 남김
  let prevEmpty = false
  $('p').each((_, el) => {
    const p = $(el)
    const empty = !p.text().replace(/ /g, ' ').trim() && p.children('img').length === 0
    if (empty && prevEmpty) p.remove()
    prevEmpty = empty
  })

  const sanitized = sanitizeHtml($.html())
  const residue = [...sanitized.matchAll(/.{0,40}jaramk\.com.{0,60}/gi)].map((m) => m[0])
  return { html: sanitized, mediaTokens, removedImages, removedLinks, residue }
}

// ---------- 1) 정적 페이지 ----------
const pages = listJson(join(PARSED_DIR, 'pages')).map((p) => readJson<ParsedPage>(p))
const pageOut: Array<Record<string, unknown>> = []
for (const p of pages) {
  const map = PAGE_MAP[p.pageCode]
  if (!map) throw new Error(`PAGE_MAP 에 pageCode=${p.pageCode} (${p.label}) 이 없습니다`)
  const localSet = new Set(p.images.filter((f) => f.ok && f.local).map((f) => f.local!))
  let source = p.contentHtml
  if (p.kind === 'pagemaker' && p.pageMaker) {
    // 결정 (c): 이미지들만 top→left 순으로 세로 나열. 텍스트 박스가 있으면 텍스트로 이어붙임.
    const items = [...p.pageMaker.items].sort((a, b) => (a.top ?? 0) - (b.top ?? 0) || (a.left ?? 0) - (b.left ?? 0))
    source =
      `<div class="legacy-pagemaker">` +
      items
        .map((it) => (it.imageSrc ? `<p><img src="${it.imageSrc}" alt="" /></p>` : it.text ? `<p>${it.text}</p>` : ''))
        .join('\n') +
      `</div>`
  }
  const r = cleanupAndTokenize(source, p.sourceUrl, localSet)
  const record = {
    pageCode: p.pageCode,
    proposed: { slug: map.slug, category: map.category, page_type: 'single', group: map.group ?? null },
    title: p.label ?? p.titleLabel ?? map.slug,
    menuPath: p.menuPath,
    kind: p.kind,
    contentHtml: r.html,
    textLength: cheerio.load(r.html).text().trim().length,
    mediaTokens: r.mediaTokens,
    attachments: p.attachments.filter((f) => f.ok && f.local).map((f) => f.local),
    removedImages: r.removedImages,
    residue: r.residue,
    legacy_source_url: p.sourceUrl,
    legacy_meta: {
      pageCode: p.pageCode,
      kind: p.kind,
      breadcrumb: p.breadcrumb,
      pageMaker: p.pageMaker
        ? { width: p.pageMaker.width, height: p.pageMaker.height, items: p.pageMaker.items.map((it) => ({ index: it.index, left: it.left, top: it.top, width: it.width, height: it.height, zIndex: it.zIndex, imageSrc: it.imageSrc, text: it.text })) }
        : null,
    },
  }
  writeJson(join(TRANSFORMED_DIR, 'pages', `${p.pageCode}.json`), record)
  pageOut.push(record)
}

// ---------- 2) 게시글 ----------
const postsDir = join(PARSED_DIR, 'posts')
const posts: ParsedPost[] = []
for (const board of readdirSync(postsDir)) for (const f of listJson(join(postsDir, board))) posts.push(readJson<ParsedPost>(f))
posts.sort((a, b) => b.num - a.num)

const toIsoDate = (d: string | null) => (d ? d.replace(/\./g, '-') : null)
const okLocal = (f: FileRecord) => (f.ok && f.local ? f.local : null)

const albumOut: Array<Record<string, unknown>> = []
const postOut: Array<Record<string, unknown>> = []
const excludedVideos: Array<{ boardID: string; num: number; name: string; local: string | null }> = []
let totalResidue = 0

for (const p of posts) {
  const map = BOARD_MAP[p.boardID]
  if (!map) throw new Error(`BOARD_MAP 에 ${p.boardID} 가 없습니다`)
  const photoLocals = p.photos.map(okLocal).filter((x): x is string => !!x)
  // 업로드는 변환본(JPEG 1920px) 을 쓴다. 변환본이 없으면(구 실행분) 원본 경로.
  const uploadLocals = p.photos.filter((f) => okLocal(f)).map((f) => f.derived?.local ?? f.local!)
  const videos = p.attachments.filter((a) => !a.isImage && VIDEO_EXT.test(a.name))
  for (const v of videos) excludedVideos.push({ boardID: p.boardID, num: p.num, name: v.name, local: v.file?.local ?? null })
  const docs = p.attachments.filter((a) => !a.isImage && !VIDEO_EXT.test(a.name) && a.file?.ok && a.file.local).map((a) => ({ name: a.name, local: a.file!.local! }))
  const legacy_meta = {
    boardID: p.boardID,
    boardLabel: p.boardLabel,
    num: p.num,
    date: p.date,
    dateSource: p.dateSource,
    views: p.views,
    photosCollected: p.photosCollected,
    photoSource: p.photoSource,
    photoCount: p.photos.length,
    pendingPhotoUrls: p.photosCollected ? [] : p.photos.filter((f) => !f.ok).map((f) => f.url),
    excludedVideos: videos.map((v) => v.name),
    commentCount: p.comments.length,
  }

  if (map.target === 'albums') {
    const body = cleanupAndTokenize(p.bodyHtml, p.sourceUrls.content, new Set(photoLocals))
    totalResidue += body.residue.length
    const description = cheerio.load(body.html).text().replace(/\s+/g, ' ').trim()
    const record = {
      boardID: p.boardID,
      num: p.num,
      proposed: { category: map.category, is_published: false },
      title: p.title ?? p.listTitle ?? `(제목 없음) #${p.num}`,
      description: description || null,
      event_date: toIsoDate(p.date),
      created_at: toIsoDate(p.date),
      cover: uploadLocals[0] ?? null,
      photos: uploadLocals.map((local, i) => ({ sort_order: i, local, original: photoLocals[i] ?? null, legacy_source_url: p.photos.filter((f) => okLocal(f))[i]?.url ?? null })),
      documents: docs, // hwp 등 — albums 에는 첨부 컬럼이 없어 Phase 3 에서 처리 방법 결정 필요
      photosCollected: p.photosCollected,
      residue: body.residue,
      legacy_source_url: p.sourceUrls.view,
      // 원본은 사진 사이에 교사 서술이 끼어 있는 "포토 에세이" 형태. albums.description 은 텍스트만 담으므로
      // 사진/글 순서가 보존된 본문 HTML(토큰화·새니타이즈 완료)을 메타에 같이 보관한다.
      legacy_meta: { ...legacy_meta, bodyHtml: body.html },
    }
    writeJson(join(TRANSFORMED_DIR, 'albums', p.boardID, `${p.num}.json`), record)
    albumOut.push(record)
  } else {
    const body = cleanupAndTokenize(p.bodyHtml, p.sourceUrls.content, new Set(photoLocals))
    totalResidue += body.residue.length
    const record = {
      boardID: p.boardID,
      num: p.num,
      proposed: { board_type: map.boardType, is_published: false, is_pinned: false },
      title: p.title ?? p.listTitle ?? `(제목 없음) #${p.num}`,
      contentHtml: body.html,
      textLength: cheerio.load(body.html).text().trim().length,
      mediaTokens: body.mediaTokens,
      removedImages: body.removedImages,
      attachments: docs, // → posts.attachment_urls (업로드 후 URL)
      view_count: p.views ?? 0,
      created_at: toIsoDate(p.date),
      residue: body.residue,
      legacy_source_url: p.sourceUrls.view,
      legacy_meta,
    }
    writeJson(join(TRANSFORMED_DIR, 'posts', p.boardID, `${p.num}.json`), record)
    postOut.push(record)
  }
}

// ---------- 3) 메뉴 트리 제안 (3단계) ----------
const inventory = readJson<{ menuTree: Array<{ label: string; mstrCode: number | null; children: Array<{ label: string; pageCode: number | null; children: Array<{ label: string; pageCode: number | null }> }> }> }>(join(OUT_DIR, 'inventory.json'))
const CATEGORY_SLUG: Record<string, string> = { 어린이집소개: 'about', 교육프로그램: 'curriculum', 입학안내: 'admission', 교육활동이야기: 'board', 커뮤니티: 'community' }
const menuProposal = inventory.menuTree.map((cat) => ({
  label: cat.label,
  slug: CATEGORY_SLUG[cat.label] ?? `cat-${cat.mstrCode}`,
  depth: 0,
  exists: true, // 5개 대분류는 이미 시드되어 있음
  children: cat.children.map((mid) => {
    const pm = mid.pageCode !== null ? PAGE_MAP[mid.pageCode] : undefined
    const bm = pages.find((p) => p.pageCode === mid.pageCode) ? null : null
    void bm
    const board = mid.pageCode !== null ? posts.find((p) => p.boardID === `www${mid.pageCode}`) : undefined
    return {
      label: mid.label,
      pageCode: mid.pageCode,
      slug: pm?.slug ?? (board ? `legacy-${board.boardID}` : mid.children.length ? (mid.children[0]?.pageCode !== null && PAGE_MAP[mid.children[0]!.pageCode!]?.group?.slug) || 'group' : 'unknown'),
      depth: 1,
      kind: pm ? 'page' : board ? `board→${BOARD_MAP[board.boardID]?.target}` : mid.children.length ? 'group(redirect)' : 'unknown',
      children: mid.children.map((leaf) => ({ label: leaf.label, pageCode: leaf.pageCode, slug: leaf.pageCode !== null ? PAGE_MAP[leaf.pageCode]?.slug ?? 'unknown' : 'unknown', depth: 2, kind: 'page' })),
    }
  }),
}))
writeJson(join(TRANSFORMED_DIR, 'menu-proposal.json'), menuProposal)

// ---------- 4) 리포트 ----------
const pageResidue = pageOut.reduce((n, p) => n + (p.residue as string[]).length, 0)
const report = {
  generatedAt: new Date().toISOString(),
  pages: {
    count: pageOut.length,
    byKind: pageOut.reduce<Record<string, number>>((acc, p) => ((acc[p.kind as string] = (acc[p.kind as string] ?? 0) + 1), acc), {}),
    mediaTokens: pageOut.reduce((n, p) => n + (p.mediaTokens as string[]).length, 0),
    removedImages: pageOut.reduce((n, p) => n + (p.removedImages as string[]).length, 0),
    residue: pageResidue,
  },
  albums: {
    count: albumOut.length,
    withPhotos: albumOut.filter((a) => (a.photos as unknown[]).length > 0).length,
    photosPending: albumOut.filter((a) => !a.photosCollected).length,
    photoRows: albumOut.reduce((n, a) => n + (a.photos as unknown[]).length, 0),
    withDescription: albumOut.filter((a) => a.description).length,
    withDocuments: albumOut.filter((a) => (a.documents as unknown[]).length > 0).length,
    byCategory: albumOut.reduce<Record<string, number>>((acc, a) => {
      const c = (a.proposed as { category: string }).category
      acc[c] = (acc[c] ?? 0) + 1
      return acc
    }, {}),
  },
  posts: {
    count: postOut.length,
    byBoardType: postOut.reduce<Record<string, number>>((acc, p) => {
      const t = (p.proposed as { board_type: string }).board_type
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
    mediaTokens: postOut.reduce((n, p) => n + (p.mediaTokens as string[]).length, 0),
    removedImages: postOut.reduce((n, p) => n + (p.removedImages as string[]).length, 0),
    withAttachments: postOut.filter((p) => (p.attachments as unknown[]).length > 0).length,
  },
  excludedVideos,
  residueTotal: pageResidue + totalResidue,
}
writeJson(join(OUT_DIR, 'phase2-report.json'), report)

console.log('=== Phase 2 변환 리포트 ===')
console.log(JSON.stringify(report, null, 2))
console.log(`\n출력: ${TRANSFORMED_DIR}`)
