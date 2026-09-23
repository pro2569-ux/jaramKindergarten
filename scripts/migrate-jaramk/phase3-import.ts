/**
 * Phase 3b. DB insert — transformed/ + out/upload-map.json → pages / menus / posts / albums / album_photos
 *   node scripts/migrate-jaramk/phase3-import.ts --dry-run     계획만 보고 (out/import-plan.json)
 *   node scripts/migrate-jaramk/phase3-import.ts               실제 insert (승인 후)
 *
 * 규칙(승인)
 * - 전부 비공개: pages/posts/albums.is_published=false, menus.is_visible=false
 * - 중복 방지: legacy_source_url 이 이미 있는 행은 건너뜀 (album_photos 는 사진 URL 단위)
 * - slug 겹치면 'legacy-' 접두어 (기존 행은 그대로)
 * - 3단 메뉴는 "그룹명 · 항목명" 으로 2단 평탄화, 대분류 5개는 기존 행 사용, 게시판은 기존 라우트가 있어 메뉴 미생성
 * - 교육자료실 → posts.board_type 'newsletter', 입소신청서 → 'notice'
 * - 사진 미수집 앨범은 이번에 넣지 않음. 부분 수집(#1389)은 받은 사진으로 넣고 legacy_meta 에 결손 기록
 * - created_at 은 원본 날짜(앨범은 event_date 도), author_id 는 admin@jaramk.com 프로필
 * - 본문의 /__legacy_media__/<로컬경로> 토큰은 upload-map 의 저장값으로 치환. 미해결 토큰/jaramk.com 잔존이 있으면 중단
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { DATA_DIR, OUT_DIR } from './lib/paths.ts'
import type { UploadMapEntry } from './phase3-upload.ts'

const DRY_RUN = process.argv.includes('--dry-run')
const TRANSFORMED_DIR = join(DATA_DIR, 'transformed')
const TOKEN_PREFIX = '/__legacy_media__/'
const ADMIN_EMAIL = 'admin@jaramk.com'
const BATCH = 100

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const listJson = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [])
const listJsonTree = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((sub) => listJson(join(dir, sub))) : [])
const log = (m: string) => process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] ${m}\n`)

// ---------- 입력 ----------
const uploadMap: Record<string, UploadMapEntry> = existsSync(join(OUT_DIR, 'upload-map.json')) ? readJson(join(OUT_DIR, 'upload-map.json')) : {}
type TPage = { pageCode: number; proposed: { slug: string; category: string; page_type: string; group: { slug: string; label: string } | null }; title: string; menuPath: string[]; kind: string; contentHtml: string; mediaTokens: string[]; attachments: string[]; legacy_source_url: string; legacy_meta: Record<string, unknown> }
type TPost = { boardID: string; num: number; proposed: { board_type: string; is_published: boolean; is_pinned: boolean }; title: string; contentHtml: string; mediaTokens: string[]; attachments: Array<{ name: string; local: string }>; view_count: number; created_at: string | null; legacy_source_url: string; legacy_meta: Record<string, unknown> }
type TAlbum = { boardID: string; num: number; proposed: { category: string }; title: string; description: string | null; event_date: string | null; created_at: string | null; cover: string | null; photos: Array<{ sort_order: number; local: string; original: string | null; legacy_source_url: string | null }>; documents: Array<{ name: string; local: string }>; photosCollected: boolean; partialOrigin: boolean; legacy_source_url: string; legacy_meta: Record<string, unknown> & { bodyHtml?: string } }
type TMenu = { label: string; slug: string; depth: number; children: Array<{ label: string; pageCode: number | null; slug: string; kind: string; children: Array<{ label: string; pageCode: number | null; slug: string }> }> }

const pages = listJson(join(TRANSFORMED_DIR, 'pages')).map((f) => readJson<TPage>(f)).sort((a, b) => a.pageCode - b.pageCode)
const posts = listJsonTree(join(TRANSFORMED_DIR, 'posts')).map((f) => readJson<TPost>(f)).sort((a, b) => a.num - b.num)
const albums = listJsonTree(join(TRANSFORMED_DIR, 'albums')).map((f) => readJson<TAlbum>(f)).filter((a) => a.photosCollected && a.photos.length > 0).sort((a, b) => a.num - b.num)
const menuProposal = readJson<TMenu[]>(join(TRANSFORMED_DIR, 'menu-proposal.json'))

// ---------- 토큰 치환 ----------
const unresolved = new Set<string>()
function refForLocal(local: string): string | null {
  const direct = uploadMap[local]
  if (direct) return direct.ref
  const derived = local.replace(/^files\/board\//, 'files/derived/board/').replace(/\.[^./]+$/, '.jpg')
  return uploadMap[derived]?.ref ?? null
}
function replaceTokens(html: string): string {
  return html.replace(/\/__legacy_media__\/([^"'\s)]+)/g, (_m, local: string) => {
    const ref = refForLocal(local)
    if (!ref) {
      unresolved.add(local)
      return TOKEN_PREFIX + local
    }
    return ref
  })
}
const residueOf = (s: string) => (s.match(/jaramk\.com/gi) ?? []).length

// ---------- DB 현황 ----------
const db = adminClient()
async function existingSet(table: string, column = 'legacy_source_url'): Promise<Set<string>> {
  const out = new Set<string>()
  let from = 0
  for (;;) {
    const { data, error } = await db.from(table).select(column).not(column, 'is', null).range(from, from + 999)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    for (const row of (data ?? []) as unknown as Array<Record<string, string>>) out.add(row[column]!)
    if (!data || data.length < 1000) break
    from += 1000
  }
  return out
}
const { data: adminRow, error: adminErr } = await db.from('profiles').select('id, email').eq('email', ADMIN_EMAIL).maybeSingle()
if (adminErr || !adminRow) throw new Error(`관리자 프로필(${ADMIN_EMAIL})을 찾을 수 없습니다: ${adminErr?.message ?? 'no row'}`)
const AUTHOR_ID = adminRow.id as string

const { data: existingPagesRows } = await db.from('pages').select('id, slug, legacy_source_url')
const existingPageSlugs = new Set((existingPagesRows ?? []).map((r) => r.slug as string))
const existingPageByLegacy = new Map((existingPagesRows ?? []).filter((r) => r.legacy_source_url).map((r) => [r.legacy_source_url as string, r.id as string]))
const { data: menuRows } = await db.from('menus').select('id, parent_id, slug, depth, sort_order, legacy_source_url')
const rootMenus = new Map((menuRows ?? []).filter((m) => m.depth === 0).map((m) => [m.slug as string, m]))
const childSlugsByParent = new Map<string, Set<string>>()
for (const m of menuRows ?? []) {
  if (m.depth !== 1) continue
  const set = childSlugsByParent.get(m.parent_id as string) ?? new Set<string>()
  set.add(m.slug as string)
  childSlugsByParent.set(m.parent_id as string, set)
}
const existingMenuLegacy = new Set((menuRows ?? []).map((m) => m.legacy_source_url as string | null).filter((x): x is string => !!x))
const existingPosts = await existingSet('posts')
const existingAlbums = await existingSet('albums')
const existingPhotos = await existingSet('album_photos')

// ---------- 계획: pages ----------
const pagePlan = pages.map((p) => {
  const already = existingPageByLegacy.has(p.legacy_source_url)
  const slug = existingPageSlugs.has(p.proposed.slug) && !already ? `legacy-${p.proposed.slug}` : p.proposed.slug
  const content = replaceTokens(p.contentHtml)
  return {
    pageCode: p.pageCode,
    skip: already,
    row: {
      slug,
      title: p.title,
      category: p.proposed.category,
      page_type: 'single',
      content,
      is_published: false,
      legacy_source_url: p.legacy_source_url,
      legacy_meta: { ...p.legacy_meta, menuPath: p.menuPath, slugPrefixed: slug !== p.proposed.slug, attachments: p.attachments.map((a) => refForLocal(a)).filter(Boolean) },
    },
    residue: residueOf(content),
  }
})

// ---------- 계획: menus (평탄화) ----------
const CATEGORY_OF_PAGE = new Map(pages.map((p) => [p.pageCode, p.proposed.category]))
const menuPlan: Array<{ parentSlug: string; label: string; slug: string; pageCode: number; sort_order: number; skip: boolean; reason: string | null }> = []
for (const cat of menuProposal) {
  const root = rootMenus.get(cat.slug)
  let order = 100 // 기존 소분류 뒤에 붙임
  for (const mid of cat.children) {
    const leaves = mid.children.length ? mid.children.map((leaf) => ({ label: `${mid.label} · ${leaf.label}`, pageCode: leaf.pageCode })) : [{ label: mid.label, pageCode: mid.pageCode }]
    for (const leaf of leaves) {
      if (leaf.pageCode === null) continue
      const page = pagePlan.find((p) => p.pageCode === leaf.pageCode)
      if (!page) {
        // 게시판(앨범/자료실)은 기존 라우트가 있어 메뉴를 만들지 않는다
        continue
      }
      order += 1
      const legacyUrl = page.row.legacy_source_url
      const reason = !root ? `대분류 '${cat.slug}' 없음` : existingMenuLegacy.has(legacyUrl) ? '이미 있음' : null
      menuPlan.push({ parentSlug: cat.slug, label: leaf.label, slug: page.row.slug, pageCode: leaf.pageCode, sort_order: order, skip: reason !== null, reason })
    }
  }
}
void CATEGORY_OF_PAGE

// ---------- 계획: posts ----------
const postPlan = posts.map((p) => {
  const content = replaceTokens(p.contentHtml)
  const attachment_urls = p.attachments.map((a) => refForLocal(a.local)).filter((x): x is string => !!x)
  return {
    boardID: p.boardID,
    num: p.num,
    skip: existingPosts.has(p.legacy_source_url),
    row: {
      board_type: p.proposed.board_type,
      title: p.title,
      content,
      author_id: AUTHOR_ID,
      is_pinned: false,
      is_published: false,
      view_count: p.view_count,
      attachment_urls,
      created_at: p.created_at ? `${p.created_at}T09:00:00+09:00` : undefined,
      legacy_source_url: p.legacy_source_url,
      legacy_meta: { ...p.legacy_meta, attachmentNames: p.attachments.map((a) => a.name) },
    },
    residue: residueOf(content) + attachment_urls.reduce((n, u) => n + residueOf(u), 0),
  }
})

// ---------- 계획: albums + photos ----------
const albumPlan = albums.map((a) => {
  const photos = a.photos.map((ph) => ({ image_url: refForLocal(ph.local), sort_order: ph.sort_order, legacy_source_url: ph.legacy_source_url }))
  const missingRefs = photos.filter((ph) => !ph.image_url).length
  const cover = a.cover ? refForLocal(a.cover) : null
  const bodyHtml = a.legacy_meta.bodyHtml ? replaceTokens(a.legacy_meta.bodyHtml) : null
  return {
    boardID: a.boardID,
    num: a.num,
    skip: existingAlbums.has(a.legacy_source_url),
    row: {
      title: a.title,
      description: a.description,
      cover_image_url: cover,
      author_id: AUTHOR_ID,
      is_published: false,
      event_date: a.event_date,
      created_at: a.created_at ? `${a.created_at}T09:00:00+09:00` : undefined,
      category: a.proposed.category,
      legacy_source_url: a.legacy_source_url,
      legacy_meta: { ...a.legacy_meta, bodyHtml },
    },
    photos: photos.filter((ph) => ph.image_url && ph.legacy_source_url && !existingPhotos.has(ph.legacy_source_url)),
    photosTotal: photos.length,
    missingRefs,
    residue: residueOf(bodyHtml ?? '') + (cover ? residueOf(cover) : 0),
  }
})

// ---------- 검증 + 리포트 ----------
const residueTotal = pagePlan.reduce((n, p) => n + p.residue, 0) + postPlan.reduce((n, p) => n + p.residue, 0) + albumPlan.reduce((n, a) => n + a.residue, 0)
const missingPhotoRefs = albumPlan.reduce((n, a) => n + a.missingRefs, 0)
const plan = {
  generatedAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  authorId: AUTHOR_ID,
  pages: { total: pagePlan.length, insert: pagePlan.filter((p) => !p.skip).length, skip: pagePlan.filter((p) => p.skip).length, prefixed: pagePlan.filter((p) => p.row.legacy_meta.slugPrefixed).map((p) => p.row.slug) },
  menus: { total: menuPlan.length, insert: menuPlan.filter((m) => !m.skip).length, skip: menuPlan.filter((m) => m.skip).length, byParent: Object.fromEntries([...new Set(menuPlan.map((m) => m.parentSlug))].map((s) => [s, menuPlan.filter((m) => m.parentSlug === s).map((m) => `${m.label} → /${s}/${m.slug}`)])) },
  posts: { total: postPlan.length, insert: postPlan.filter((p) => !p.skip).length, skip: postPlan.filter((p) => p.skip).length, byType: Object.fromEntries(['newsletter', 'notice'].map((t) => [t, postPlan.filter((p) => p.row.board_type === t).length])), withAttachments: postPlan.filter((p) => p.row.attachment_urls.length).length },
  albums: { total: albumPlan.length, insert: albumPlan.filter((a) => !a.skip).length, skip: albumPlan.filter((a) => a.skip).length, photos: albumPlan.reduce((n, a) => n + a.photosTotal, 0), photosInsert: albumPlan.filter((a) => !a.skip).reduce((n, a) => n + a.photos.length, 0), byCategory: Object.fromEntries([...new Set(albumPlan.map((a) => a.row.category))].map((c) => [c, albumPlan.filter((a) => a.row.category === c).length])), partial: albums.filter((a) => a.partialOrigin).map((a) => `${a.boardID}#${a.num}`) },
  checks: { unresolvedTokens: [...unresolved], missingPhotoRefs, residueTotal },
  samples: {
    page: pagePlan[0] ? { slug: pagePlan[0].row.slug, title: pagePlan[0].row.title, contentHead: pagePlan[0].row.content.slice(0, 160) } : null,
    post: postPlan[0] ? { title: postPlan[0].row.title, board_type: postPlan[0].row.board_type, created_at: postPlan[0].row.created_at, attachment_urls: postPlan[0].row.attachment_urls } : null,
    album: albumPlan[0] ? { title: albumPlan[0].row.title, category: albumPlan[0].row.category, event_date: albumPlan[0].row.event_date, cover: albumPlan[0].row.cover_image_url, firstPhoto: albumPlan[0].photos[0] } : null,
  },
}
writeFileSync(join(OUT_DIR, 'import-plan.json'), JSON.stringify({ ...plan, detail: { pagePlan: pagePlan.map((p) => ({ pageCode: p.pageCode, slug: p.row.slug, skip: p.skip })), menuPlan, postPlan: postPlan.map((p) => ({ num: p.num, board_type: p.row.board_type, skip: p.skip })), albumPlan: albumPlan.map((a) => ({ boardID: a.boardID, num: a.num, skip: a.skip, photos: a.photos.length })) } }, null, 2))

console.log(`=== Phase 3b DB insert 계획 ${DRY_RUN ? '(dry-run)' : ''} ===`)
console.log(`author_id: ${ADMIN_EMAIL} (${AUTHOR_ID.slice(0, 8)}…)`)
console.log(`pages : ${plan.pages.insert} insert / ${plan.pages.skip} skip (legacy- 접두어: ${plan.pages.prefixed.join(', ') || '없음'})`)
console.log(`menus : ${plan.menus.insert} insert / ${plan.menus.skip} skip`)
for (const [parent, items] of Object.entries(plan.menus.byParent)) console.log(`   [${parent}] ${(items as string[]).join(' | ')}`)
console.log(`posts : ${plan.posts.insert} insert / ${plan.posts.skip} skip  (newsletter ${plan.posts.byType.newsletter}, notice ${plan.posts.byType.notice}, 첨부 있는 글 ${plan.posts.withAttachments})`)
console.log(`albums: ${plan.albums.insert} insert / ${plan.albums.skip} skip, album_photos ${plan.albums.photosInsert} insert (전체 ${plan.albums.photos})`)
console.log(`   반별: ${Object.entries(plan.albums.byCategory).map(([c, n]) => `${c} ${n}`).join(', ')}`)
console.log(`   부분 수집: ${plan.albums.partial.join(', ') || '없음'}`)
console.log(`검증: 미해결 토큰 ${unresolved.size}, 사진 참조 누락 ${missingPhotoRefs}, jaramk.com 잔존 ${residueTotal}`)
console.log('샘플:', JSON.stringify(plan.samples, null, 1).slice(0, 1200))

if (unresolved.size || missingPhotoRefs || residueTotal) {
  console.error('\n중단: 검증 실패 (미해결 토큰/참조 누락/잔존 URL). 업로드 결과(upload-map.json)를 확인하세요.')
  process.exit(2)
}
if (DRY_RUN) {
  console.log('\n(dry-run: insert 하지 않음. out/import-plan.json 저장)')
  process.exit(0)
}

// ---------- 실제 insert ----------
async function insertBatch<T extends Record<string, unknown>>(table: string, rows: T[], select = 'id, legacy_source_url'): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { data, error } = await db.from(table).insert(chunk).select(select)
    if (error) throw new Error(`${table} insert 실패 (batch ${i / BATCH + 1}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
    log(`${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
  return out
}

const result = { pages: 0, menus: 0, posts: 0, albums: 0, album_photos: 0 }

// pages → id 맵 (menus 연결용)
const pageIdByLegacy = new Map<string, string>(existingPageByLegacy)
const pageRows = pagePlan.filter((p) => !p.skip).map((p) => p.row)
if (pageRows.length) {
  const inserted = await insertBatch('pages', pageRows)
  for (const r of inserted) pageIdByLegacy.set(r.legacy_source_url as string, r.id as string)
  result.pages = inserted.length
}

// menus
const menuRowsToInsert = menuPlan
  .filter((m) => !m.skip)
  .map((m) => {
    const page = pagePlan.find((p) => p.pageCode === m.pageCode)!
    const root = rootMenus.get(m.parentSlug)!
    return {
      parent_id: root.id as string,
      label: m.label,
      slug: m.slug,
      page_id: pageIdByLegacy.get(page.row.legacy_source_url) ?? null,
      sort_order: m.sort_order,
      is_visible: false,
      depth: 1,
      legacy_source_url: page.row.legacy_source_url,
    }
  })
  .filter((m) => m.page_id)
if (menuRowsToInsert.length) result.menus = (await insertBatch('menus', menuRowsToInsert, 'id')).length

// posts
const postRows = postPlan.filter((p) => !p.skip).map((p) => p.row)
if (postRows.length) result.posts = (await insertBatch('posts', postRows)).length

// albums → album_photos
const albumRows = albumPlan.filter((a) => !a.skip)
for (let i = 0; i < albumRows.length; i += BATCH) {
  const chunk = albumRows.slice(i, i + BATCH)
  const { data, error } = await db.from('albums').insert(chunk.map((a) => a.row)).select('id, legacy_source_url')
  if (error) throw new Error(`albums insert 실패 (batch ${i / BATCH + 1}): ${error.message}`)
  const idByLegacy = new Map((data ?? []).map((r) => [r.legacy_source_url as string, r.id as string]))
  const photoRows = chunk.flatMap((a) => {
    const albumId = idByLegacy.get(a.row.legacy_source_url)
    if (!albumId) return []
    return a.photos.map((ph) => ({ album_id: albumId, image_url: ph.image_url!, caption: null, sort_order: ph.sort_order, legacy_source_url: ph.legacy_source_url }))
  })
  if (photoRows.length) result.album_photos += (await insertBatch('album_photos', photoRows, 'id')).length
  result.albums += (data ?? []).length
  log(`albums: ${Math.min(i + BATCH, albumRows.length)}/${albumRows.length}`)
}

writeFileSync(join(OUT_DIR, 'import-result.json'), JSON.stringify({ finishedAt: new Date().toISOString(), result }, null, 2))
console.log('\n완료:', JSON.stringify(result))
