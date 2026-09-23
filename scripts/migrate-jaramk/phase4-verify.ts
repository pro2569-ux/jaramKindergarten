/**
 * Phase 4. 검증 (읽기 전용) — DB/Storage 를 읽기만 한다.
 *   node scripts/migrate-jaramk/phase4-verify.ts
 * 1) 원본 vs 이관 건수 (게시판/테이블별)
 * 2) jaramk.com 잔존 (본문·첨부·이미지 참조. legacy_source_url 과 legacy_meta 의 원본 URL 목록은 식별자라 제외)
 * 3) 깨진 이미지/누락 첨부: legacy-media 는 서명 URL 로, publicImage 는 공개 URL 로 전부 GET 해서 상태·바이트 대조
 * 4) 샘플 앨범 로컬 HTML 미리보기 (서명 URL 1시간) → out/preview-album.html
 * 5) 날짜 근사(interpolated) 글 목록 → out/interpolated-dates.csv
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { OUT_DIR } from './lib/paths.ts'
import type { UploadMapEntry } from './phase3-upload.ts'

const db = adminClient()
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const log = (m: string) => process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] ${m}\n`)
const SAMPLE_ALBUM_TITLE = '자람동산 한마음 운동회1'
const PREFIX = 'legacy-media:'

async function fetchAll<T>(table: string, select: string, filter?: (q: ReturnType<typeof db.from>) => unknown): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    let q = db.from(table).select(select).range(from, from + 999)
    if (filter) q = (filter(q as unknown as ReturnType<typeof db.from>) as typeof q) ?? q
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < 1000) break
    from += 1000
  }
  return rows
}

// ---------- 로드 ----------
type PageRow = { id: string; slug: string; title: string; content: string | null; legacy_source_url: string; legacy_meta: Record<string, unknown> }
type PostRow = { id: string; title: string; board_type: string; content: string | null; attachment_urls: string[] | null; created_at: string; legacy_source_url: string; legacy_meta: Record<string, unknown> }
type AlbumRow = { id: string; title: string; description: string | null; category: string; cover_image_url: string | null; event_date: string | null; legacy_source_url: string; legacy_meta: Record<string, unknown> }
type PhotoRow = { id: string; album_id: string; image_url: string; sort_order: number; legacy_source_url: string }

const pages = await fetchAll<PageRow>('pages', 'id, slug, title, content, legacy_source_url, legacy_meta', (q) => (q as unknown as { not: (c: string, o: string, v: null) => unknown }).not('legacy_source_url', 'is', null))
const posts = await fetchAll<PostRow>('posts', 'id, title, board_type, content, attachment_urls, created_at, legacy_source_url, legacy_meta', (q) => (q as unknown as { not: (c: string, o: string, v: null) => unknown }).not('legacy_source_url', 'is', null))
const albums = await fetchAll<AlbumRow>('albums', 'id, title, description, category, cover_image_url, event_date, legacy_source_url, legacy_meta', (q) => (q as unknown as { not: (c: string, o: string, v: null) => unknown }).not('legacy_source_url', 'is', null))
const photos = await fetchAll<PhotoRow>('album_photos', 'id, album_id, image_url, sort_order, legacy_source_url', (q) => (q as unknown as { not: (c: string, o: string, v: null) => unknown }).not('legacy_source_url', 'is', null))
const menus = await fetchAll<{ id: string; slug: string; legacy_source_url: string }>('menus', 'id, slug, legacy_source_url', (q) => (q as unknown as { not: (c: string, o: string, v: null) => unknown }).not('legacy_source_url', 'is', null))
log(`DB: pages ${pages.length}, menus ${menus.length}, posts ${posts.length}, albums ${albums.length}, album_photos ${photos.length}`)

const boardsJson = readJson<{ boards: Array<{ boardID: string; label: string | null; total: number }> }>(join(OUT_DIR, 'boards.json'))
const inventory = readJson<{ summary: { staticPages: number } }>(join(OUT_DIR, 'inventory.json'))
const uploadMap = readJson<Record<string, UploadMapEntry>>(join(OUT_DIR, 'upload-map.json'))
const bytesByObject = new Map<string, number>()
for (const e of Object.values(uploadMap)) bytesByObject.set(`${e.bucket}/${e.objectPath}`, e.bytes)
const phase1 = readJson<{ byBoard: Array<{ boardID: string; posts: number; collectedPosts: number; photoFiles: number }> }>(join(OUT_DIR, 'phase1-report.json'))

// ---------- 1) 건수 대조 ----------
const byBoard = (rows: Array<{ legacy_meta: Record<string, unknown> }>) => {
  const m = new Map<string, number>()
  for (const r of rows) {
    const b = String(r.legacy_meta.boardID ?? '?')
    m.set(b, (m.get(b) ?? 0) + 1)
  }
  return m
}
const albumsByBoard = byBoard(albums)
const postsByBoard = byBoard(posts)
const photosByAlbum = new Map<string, number>()
for (const p of photos) photosByAlbum.set(p.album_id, (photosByAlbum.get(p.album_id) ?? 0) + 1)
const countRows = boardsJson.boards.map((b) => {
  const p1 = phase1.byBoard.find((x) => x.boardID === b.boardID)
  const migrated = (albumsByBoard.get(b.boardID) ?? 0) + (postsByBoard.get(b.boardID) ?? 0)
  const expected = b.boardID === 'www27' || b.boardID === 'www49' ? b.total : (p1?.collectedPosts ?? 0)
  return { boardID: b.boardID, label: b.label, original: b.total, expected, migrated, ok: migrated === expected, notMigrated: b.total - migrated }
})
const expectedPhotos = phase1.byBoard.filter((b) => !['www27', 'www49'].includes(b.boardID)).reduce((n, b) => n + b.photoFiles, 0)
const counts = {
  pages: { original: inventory.summary.staticPages, migrated: pages.length, ok: pages.length === inventory.summary.staticPages },
  menus: { expected: 21, migrated: menus.length, ok: menus.length === 21 },
  boards: countRows,
  photos: { expected: expectedPhotos, migrated: photos.length, ok: photos.length === expectedPhotos },
  albumsWithoutPhotos: albums.filter((a) => !photosByAlbum.get(a.id)).length,
  albumsWithoutCover: albums.filter((a) => !a.cover_image_url).length,
}

// ---------- 2) 잔존 ----------
const RE = /jaramk\.com/gi
const residue: Array<{ table: string; id: string; field: string; hits: number }> = []
const check = (table: string, id: string, field: string, v: unknown) => {
  if (typeof v !== 'string') return
  const hits = (v.match(RE) ?? []).length
  if (hits) residue.push({ table, id, field, hits })
}
for (const r of pages) check('pages', r.id, 'content', r.content)
for (const r of posts) {
  check('posts', r.id, 'content', r.content)
  for (const u of r.attachment_urls ?? []) check('posts', r.id, 'attachment_urls', u)
}
for (const r of albums) {
  check('albums', r.id, 'description', r.description)
  check('albums', r.id, 'cover_image_url', r.cover_image_url)
  check('albums', r.id, 'legacy_meta.bodyHtml', r.legacy_meta.bodyHtml)
}
for (const r of photos) check('album_photos', r.id, 'image_url', r.image_url)

// ---------- 3) 이미지/첨부 GET 검사 ----------
type Probe = { bucket: string; objectPath: string; url: string; from: string }
const probes = new Map<string, Probe>()
const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`
function addPublicUrl(u: string, from: string) {
  if (!u.startsWith(publicBase)) return
  const rest = u.slice(publicBase.length).split('?')[0]!
  const [bucket, ...pathParts] = rest.split('/')
  const key = `${bucket}/${pathParts.join('/')}`
  if (!probes.has(key)) probes.set(key, { bucket: bucket!, objectPath: pathParts.join('/'), url: u, from })
}
for (const r of pages) for (const m of (r.content ?? '').matchAll(/src="([^"]+)"/g)) addPublicUrl(m[1]!, `pages/${r.slug}`)
for (const r of posts) {
  for (const m of (r.content ?? '').matchAll(/src="([^"]+)"/g)) addPublicUrl(m[1]!, `posts/${r.id}`)
  for (const u of r.attachment_urls ?? []) addPublicUrl(u, `posts/${r.id}/attachment`)
}
const legacyPaths = new Map<string, string>() // objectPath → from
for (const p of photos) if (p.image_url.startsWith(PREFIX)) legacyPaths.set(p.image_url.slice(PREFIX.length), `album_photos/${p.id}`)
for (const a of albums) if (a.cover_image_url?.startsWith(PREFIX)) legacyPaths.set(a.cover_image_url.slice(PREFIX.length), `albums/${a.id}/cover`)

const failures: Array<{ bucket: string; objectPath: string; from: string; reason: string }> = []
let checked = 0
async function probeUrl(bucket: string, objectPath: string, url: string, from: string) {
  try {
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    const expected = bytesByObject.get(`${bucket}/${objectPath}`)
    if (!res.ok) failures.push({ bucket, objectPath, from, reason: `HTTP ${res.status}` })
    else if (buf.byteLength === 0) failures.push({ bucket, objectPath, from, reason: '빈 응답' })
    else if (expected !== undefined && expected !== buf.byteLength) failures.push({ bucket, objectPath, from, reason: `크기 불일치 ${buf.byteLength} ≠ ${expected}` })
    else if (/\.jpe?g$/i.test(objectPath) && buf.subarray(0, 3).toString('hex') !== 'ffd8ff') failures.push({ bucket, objectPath, from, reason: 'JPEG 아님' })
  } catch (err) {
    failures.push({ bucket, objectPath, from, reason: err instanceof Error ? err.message : String(err) })
  }
  checked += 1
  if (checked % 500 === 0) log(`GET 검사 ${checked}`)
}
async function runPool(tasks: Array<() => Promise<void>>, size = 8) {
  const queue = [...tasks]
  await Promise.all(Array.from({ length: size }, async () => {
    for (;;) {
      const t = queue.shift()
      if (!t) return
      await t()
    }
  }))
}
// legacy-media: 100개씩 서명 → GET
const legacyList = [...legacyPaths.entries()]
log(`legacy-media 검사 대상 ${legacyList.length}, publicImage 검사 대상 ${probes.size}`)
const legacyTasks: Array<() => Promise<void>> = []
for (let i = 0; i < legacyList.length; i += 100) {
  const chunk = legacyList.slice(i, i + 100)
  const { data, error } = await db.storage.from('legacy-media').createSignedUrls(chunk.map(([p]) => p), 900)
  if (error || !data) {
    for (const [p, from] of chunk) failures.push({ bucket: 'legacy-media', objectPath: p, from, reason: `서명 실패: ${error?.message}` })
    continue
  }
  data.forEach((d, k) => {
    const [p, from] = chunk[k]!
    if (d.error || !d.signedUrl) failures.push({ bucket: 'legacy-media', objectPath: p, from, reason: `서명 실패: ${d.error}` })
    else legacyTasks.push(() => probeUrl('legacy-media', p, d.signedUrl, from))
  })
}
await runPool(legacyTasks)
await runPool([...probes.values()].map((p) => () => probeUrl(p.bucket, p.objectPath, p.url, p.from)))

// ---------- 4) 샘플 앨범 로컬 HTML ----------
const sample = albums.find((a) => a.title === SAMPLE_ALBUM_TITLE) ?? albums[0]!
const samplePhotos = photos.filter((p) => p.album_id === sample.id).sort((a, b) => a.sort_order - b.sort_order)
const { data: signed } = await db.storage.from('legacy-media').createSignedUrls(samplePhotos.map((p) => p.image_url.slice(PREFIX.length)), 3600)
const previewHtml = `<!doctype html><meta charset="utf-8"><title>미리보기: ${sample.title}</title>
<style>body{font-family:sans-serif;max-width:1100px;margin:24px auto;padding:0 16px}img{width:100%;height:auto;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.meta{color:#555}</style>
<h1>${sample.title}</h1>
<p class="meta">${sample.category} · ${sample.event_date ?? ''} · 사진 ${samplePhotos.length}장 · 서명 URL 은 생성 후 1시간 유효 (${new Date().toLocaleString('ko-KR')})</p>
${sample.description ? `<p>${sample.description}</p>` : ''}
<div class="grid">${(signed ?? []).map((s, i) => `<figure><img src="${s.signedUrl ?? ''}" alt="${i + 1}"><figcaption>#${i + 1} ${samplePhotos[i]?.image_url.slice(PREFIX.length).split('/').pop()}</figcaption></figure>`).join('\n')}</div>`
writeFileSync(join(OUT_DIR, 'preview-album.html'), previewHtml)

// ---------- 5) 날짜 근사 목록 ----------
const interpolated = posts
  .filter((p) => p.legacy_meta.dateSource === 'interpolated')
  .sort((a, b) => Number(a.legacy_meta.num) - Number(b.legacy_meta.num))
  .map((p) => ({ num: Number(p.legacy_meta.num), post_id: p.id, board_type: p.board_type, title: p.title, approx_date: p.created_at.slice(0, 10), admin_url: `/admin/posts/${p.id}/edit` }))
const csv = ['num,post_id,board_type,title,approx_date,admin_url', ...interpolated.map((r) => [r.num, r.post_id, r.board_type, `"${r.title.replace(/"/g, '""')}"`, r.approx_date, r.admin_url].join(','))].join('\n')
writeFileSync(join(OUT_DIR, 'interpolated-dates.csv'), '﻿' + csv)

// ---------- 리포트 ----------
const report = { generatedAt: new Date().toISOString(), counts, residue, imageCheck: { legacyChecked: legacyList.length, publicChecked: probes.size, failures }, interpolated, sampleAlbum: { id: sample.id, title: sample.title, photos: samplePhotos.length, previewFile: join(OUT_DIR, 'preview-album.html') } }
writeFileSync(join(OUT_DIR, 'phase4-report.json'), JSON.stringify(report, null, 2))

console.log('=== 1) 원본 vs 이관 건수 ===')
console.log(`pages: 원본 ${counts.pages.original} → 이관 ${counts.pages.migrated} ${counts.pages.ok ? '✅' : '❌'}   menus: ${counts.menus.migrated}/${counts.menus.expected} ${counts.menus.ok ? '✅' : '❌'}`)
console.log('boardID  라벨        원본   이관예정  이관   미이관(범위밖)')
for (const r of countRows) console.log(`${r.boardID.padEnd(8)} ${(r.label ?? '').padEnd(10)} ${String(r.original).padStart(4)}   ${String(r.expected).padStart(6)}   ${String(r.migrated).padStart(4)} ${r.ok ? '✅' : '❌'}   ${String(r.notMigrated).padStart(4)}`)
console.log(`album_photos: 예정 ${counts.photos.expected} → 이관 ${counts.photos.migrated} ${counts.photos.ok ? '✅' : '❌'}  (사진 0장 앨범 ${counts.albumsWithoutPhotos}, 커버 없는 앨범 ${counts.albumsWithoutCover})`)
console.log(`\n=== 2) jaramk.com 잔존 === ${residue.length === 0 ? '0건 ✅' : residue.length + '건 ❌'}`)
for (const r of residue.slice(0, 20)) console.log(`  ${r.table}.${r.field} ${r.id} (${r.hits})`)
console.log(`\n=== 3) 이미지/첨부 GET 검사 === legacy-media ${legacyList.length}개, publicImage ${probes.size}개 → 실패 ${failures.length}건 ${failures.length === 0 ? '✅' : '❌'}`)
for (const f of failures.slice(0, 30)) console.log(`  ✗ ${f.bucket}/${f.objectPath} (${f.from}): ${f.reason}`)
console.log(`\n=== 4) 샘플 앨범 미리보기 === ${report.sampleAlbum.previewFile} («${sample.title}», ${samplePhotos.length}장)`)
console.log(`\n=== 5) 날짜 근사 글 === ${interpolated.length}건 → ${join(OUT_DIR, 'interpolated-dates.csv')}`)
for (const r of interpolated) console.log(`  #${r.num} ${r.approx_date} «${r.title}» ${r.admin_url}`)
