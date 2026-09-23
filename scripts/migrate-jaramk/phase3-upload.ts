/**
 * Phase 3a. Storage 업로드 — transformed/ 를 읽어 업로드 계획을 만들고, --dry-run 이면 계획만 보고한다.
 *   node scripts/migrate-jaramk/phase3-upload.ts --dry-run
 *   node scripts/migrate-jaramk/phase3-upload.ts            (실제 업로드, 승인 후)
 *
 * 대상/경로
 * - 앨범 사진(변환본 JPEG)          → legacy-media (private) : board/<boardID>/<num>/<파일>.jpg   → DB 값 'legacy-media:board/...'
 * - 정적 페이지 이미지               → publicImage             : legacy/static/<pageCode>/<파일>
 * - 게시글(교육자료실) 본문 인라인 이미지 → publicImage         : legacy/board/<boardID>/<num>/<파일>.jpg
 * - hwp 등 비이미지 첨부(동영상 제외)   → publicImage           : legacy/attach/<boardID>/<num>/<파일>
 * 사진 미수집 앨범(photosCollected=false)은 이번 대상이 아님.
 *
 * 이어받기: out/upload-map.json 에 기록된 항목과 버킷에 이미 있는 객체는 건너뜀 (upsert 하지 않음).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { adminClient, supabaseUrl } from './lib/supabase-admin.ts'
import { DATA_DIR, OUT_DIR } from './lib/paths.ts'

const DRY_RUN = process.argv.includes('--dry-run')
const CONCURRENCY = 4
const TRANSFORMED_DIR = join(DATA_DIR, 'transformed')
const PUBLIC_BUCKET = 'publicImage'
const PRIVATE_BUCKET = 'legacy-media'

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const listJson = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [])
const listJsonTree = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((sub) => listJson(join(dir, sub))) : [])
const mb = (n: number) => (n / 1024 / 1024).toFixed(1)
const safeSegment = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)

export interface UploadItem {
  bucket: string
  objectPath: string
  localPath: string // DATA_DIR 기준 상대
  bytes: number
  contentType: string
  kind: 'album-photo' | 'static-image' | 'post-image' | 'attachment'
  /** 첨부: 다운로드 시 쓸 원래 파일명 (객체 키에는 한글이 허용되지 않아 ?download= 로 전달) */
  downloadName?: string
}
export interface UploadMapEntry {
  bucket: string
  objectPath: string
  ref: string // DB 에 저장할 값: 공개 URL 또는 'legacy-media:<경로>'
  bytes: number
  uploadedAt: string
}

function contentTypeOf(path: string): string {
  const ext = path.toLowerCase().split('.').pop() ?? ''
  return (
    {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
      hwp: 'application/x-hwp', hwpx: 'application/x-hwpx', pdf: 'application/pdf',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      zip: 'application/zip',
    }[ext] ?? 'application/octet-stream'
  )
}

function refFor(bucket: string, objectPath: string, downloadName?: string): string {
  if (bucket === PRIVATE_BUCKET) return `${PRIVATE_BUCKET}:${objectPath}`
  const url = `${supabaseUrl()}/storage/v1/object/public/${bucket}/${objectPath}`
  return downloadName ? `${url}?download=${encodeURIComponent(downloadName)}` : url
}

/** 첨부 객체 키: Storage 키는 ASCII 만 안전하므로 <fileNum>.<ext> 로 두고 원래 이름은 downloadName 으로 보존 */
function attachmentObjectName(local: string): { objectName: string; downloadName: string } {
  const base = basename(local)
  const m = /^(\d+)_(.+)$/.exec(base)
  const ext = (base.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (m?.[1]) return { objectName: `${m[1]}.${ext || 'bin'}`, downloadName: m[2] ?? base }
  return { objectName: base.replace(/[^A-Za-z0-9._-]/g, '_'), downloadName: base }
}

// ---------- 계획 수립 ----------
const items = new Map<string, UploadItem>() // key: bucket/objectPath
function add(kind: UploadItem['kind'], bucket: string, objectPath: string, localPath: string, downloadName?: string) {
  const abs = join(DATA_DIR, localPath)
  if (!existsSync(abs)) {
    missingLocal.push(localPath)
    return
  }
  const key = `${bucket}/${objectPath}`
  if (items.has(key)) return
  items.set(key, { bucket, objectPath, localPath, bytes: statSync(abs).size, contentType: contentTypeOf(localPath), kind, downloadName })
}
const missingLocal: string[] = []

// 정적 페이지: mediaTokens(files/static/<pageCode>/<파일>) + attachments
for (const f of listJson(join(TRANSFORMED_DIR, 'pages'))) {
  const p = readJson<{ pageCode: number; mediaTokens: string[]; attachments: string[] }>(f)
  for (const local of p.mediaTokens) add('static-image', PUBLIC_BUCKET, `legacy/static/${p.pageCode}/${safeSegment(basename(local))}`, local)
  for (const local of p.attachments) {
    const { objectName, downloadName } = attachmentObjectName(local)
    add('attachment', PUBLIC_BUCKET, `legacy/static/${p.pageCode}/attach/${objectName}`, local, downloadName)
  }
}

// 게시글(posts): 본문 인라인 이미지(변환본이 있으면 변환본) + 첨부(hwp)
for (const f of listJsonTree(join(TRANSFORMED_DIR, 'posts'))) {
  const p = readJson<{ boardID: string; num: number; mediaTokens: string[]; attachments: Array<{ name: string; local: string }> }>(f)
  for (const local of p.mediaTokens) {
    const derived = local.replace(/^files\/board\//, 'files/derived/board/').replace(/\.[^./]+$/, '.jpg')
    const use = existsSync(join(DATA_DIR, derived)) ? derived : local
    add('post-image', PUBLIC_BUCKET, `legacy/board/${p.boardID}/${p.num}/${safeSegment(basename(use))}`, use)
  }
  for (const a of p.attachments) {
    const { objectName } = attachmentObjectName(a.local)
    add('attachment', PUBLIC_BUCKET, `legacy/attach/${p.boardID}/${p.num}/${objectName}`, a.local, a.name || basename(a.local))
  }
}

// 앨범: 사진 수집 완료된 것만, 변환본 경로
let albumsIncluded = 0
let albumsSkipped = 0
for (const f of listJsonTree(join(TRANSFORMED_DIR, 'albums'))) {
  const a = readJson<{ boardID: string; num: number; photosCollected: boolean; photos: Array<{ local: string }>; documents: Array<{ name: string; local: string }> }>(f)
  if (!a.photosCollected || a.photos.length === 0) {
    albumsSkipped += 1
    continue
  }
  albumsIncluded += 1
  for (const ph of a.photos) add('album-photo', PRIVATE_BUCKET, `board/${a.boardID}/${a.num}/${safeSegment(basename(ph.local))}`, ph.local)
  for (const d of a.documents) {
    const { objectName } = attachmentObjectName(d.local)
    add('attachment', PUBLIC_BUCKET, `legacy/attach/${a.boardID}/${a.num}/${objectName}`, d.local, d.name || basename(d.local))
  }
}

const plan = [...items.values()]
const mapPath = join(OUT_DIR, 'upload-map.json')
const uploadMap: Record<string, UploadMapEntry> = existsSync(mapPath) ? readJson<Record<string, UploadMapEntry>>(mapPath) : {}

// 버킷에 이미 있는 객체 확인 (list, prefix 별 페이지네이션)
async function listExisting(bucket: string, prefix: string): Promise<Set<string>> {
  const found = new Set<string>()
  const client = adminClient()
  async function walk(dir: string) {
    let offset = 0
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(dir, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`list ${bucket}/${dir}: ${error.message}`)
      for (const it of data ?? []) {
        const path = dir ? `${dir}/${it.name}` : it.name
        if (it.id === null) await walk(path)
        else found.add(path)
      }
      if (!data || data.length < 1000) break
      offset += 1000
    }
  }
  await walk(prefix)
  return found
}
const existing = new Map<string, Set<string>>()
for (const [bucket, prefix] of [
  [PUBLIC_BUCKET, 'legacy'],
  [PRIVATE_BUCKET, 'board'],
] as const) {
  existing.set(bucket, await listExisting(bucket, prefix))
}

const summary = new Map<string, { count: number; bytes: number; already: number; alreadyBytes: number; kinds: Record<string, number> }>()
for (const it of plan) {
  const s = summary.get(it.bucket) ?? { count: 0, bytes: 0, already: 0, alreadyBytes: 0, kinds: {} }
  s.count += 1
  s.bytes += it.bytes
  s.kinds[it.kind] = (s.kinds[it.kind] ?? 0) + 1
  if (existing.get(it.bucket)?.has(it.objectPath) || uploadMap[it.localPath]) {
    s.already += 1
    s.alreadyBytes += it.bytes
  }
  summary.set(it.bucket, s)
}

console.log(`=== Phase 3a 업로드 계획 ${DRY_RUN ? '(dry-run)' : ''} ===`)
console.log(`앨범: 업로드 대상 ${albumsIncluded}개 / 제외(사진 미수집) ${albumsSkipped}개`)
for (const [bucket, s] of summary) {
  console.log(`\n[${bucket}] ${s.count}개 ${mb(s.bytes)}MB (이미 있음 ${s.already}개 ${mb(s.alreadyBytes)}MB → 올릴 것 ${s.count - s.already}개 ${mb(s.bytes - s.alreadyBytes)}MB)`)
  for (const [k, n] of Object.entries(s.kinds)) console.log(`   ${k}: ${n}`)
}
if (missingLocal.length) console.log(`\n⚠ 로컬 파일 없음 ${missingLocal.length}건: ${missingLocal.slice(0, 5).join(', ')}`)
const totalBytes = plan.reduce((n, it) => n + it.bytes, 0)
console.log(`\n합계 ${plan.length}개 ${mb(totalBytes)}MB`)
console.log('예시 경로:')
for (const kind of ['album-photo', 'static-image', 'post-image', 'attachment'] as const) {
  const ex = plan.find((it) => it.kind === kind)
  if (ex) console.log(`  ${kind.padEnd(12)} ${ex.bucket}/${ex.objectPath}`)
}
writeFileSync(join(OUT_DIR, 'upload-plan.json'), JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, albumsIncluded, albumsSkipped, summary: Object.fromEntries(summary), missingLocal, items: plan }, null, 2))

if (DRY_RUN) {
  console.log('\n(dry-run: 업로드하지 않음. out/upload-plan.json 저장)')
  process.exit(0)
}

// ---------- 실제 업로드 ----------
const client = adminClient()
let done = 0
let skipped = 0
let failed = 0
const failures: Array<{ localPath: string; reason: string }> = []
const queue = [...plan]
const saveMap = () => writeFileSync(mapPath, JSON.stringify(uploadMap, null, 2))

async function worker() {
  for (;;) {
    const it = queue.shift()
    if (!it) return
    const ref = refFor(it.bucket, it.objectPath, it.downloadName)
    if (uploadMap[it.localPath] || existing.get(it.bucket)?.has(it.objectPath)) {
      if (!uploadMap[it.localPath]) uploadMap[it.localPath] = { bucket: it.bucket, objectPath: it.objectPath, ref, bytes: it.bytes, uploadedAt: 'pre-existing' }
      skipped += 1
      continue
    }
    const body = readFileSync(join(DATA_DIR, it.localPath))
    const { error } = await client.storage.from(it.bucket).upload(it.objectPath, body, { contentType: it.contentType, upsert: false })
    if (error) {
      if (/already exists|Duplicate/i.test(error.message)) {
        uploadMap[it.localPath] = { bucket: it.bucket, objectPath: it.objectPath, ref, bytes: it.bytes, uploadedAt: 'pre-existing' }
        skipped += 1
      } else {
        failed += 1
        failures.push({ localPath: it.localPath, reason: error.message })
      }
    } else {
      uploadMap[it.localPath] = { bucket: it.bucket, objectPath: it.objectPath, ref, bytes: it.bytes, uploadedAt: new Date().toISOString() }
      done += 1
    }
    if ((done + skipped + failed) % 50 === 0) {
      saveMap()
      process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] 진행 ${done + skipped + failed}/${plan.length} (업로드 ${done}, 건너뜀 ${skipped}, 실패 ${failed})\n`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
saveMap()
writeFileSync(join(OUT_DIR, 'upload-failures.json'), JSON.stringify(failures, null, 2))
console.log(`\n완료: 업로드 ${done}, 건너뜀(이미 있음) ${skipped}, 실패 ${failed} → out/upload-map.json`)
for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f.localPath}: ${f.reason}`)
process.exit(failed ? 1 : 0)
