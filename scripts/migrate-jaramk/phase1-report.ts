/**
 * Phase 1 리포트 — parsed/ 와 files/ 를 집계하고, 날짜 없는 글을 인접 글번호로 근사(플래그)한다.
 *   node scripts/migrate-jaramk/phase1-report.ts
 * 산출: out/phase1-report.json, out/photo-pending.json (사진 미수집 글 + 원본 URL), out/url-map.json (원본 URL → 로컬 파일)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, OUT_DIR, PARSED_DIR } from './lib/paths.ts'
import { fetchHtml } from './lib/http.ts'
import type { ParsedPage, ParsedPost, FileRecord } from './phase1-collect.ts'

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const mb = (n: number) => (n / 1024 / 1024).toFixed(1)
const listJson = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [])

// ---------- 로드 ----------
const pages = listJson(join(PARSED_DIR, 'pages')).map((p) => readJson<ParsedPage>(p))
const postsDir = join(PARSED_DIR, 'posts')
const posts: ParsedPost[] = []
if (existsSync(postsDir)) {
  for (const board of readdirSync(postsDir)) for (const f of listJson(join(postsDir, board))) posts.push(readJson<ParsedPost>(f))
}
posts.sort((a, b) => b.num - a.num)

// ---------- 메인 페이지 미리보기의 실제 날짜 ([2026.02.19] + 링크 num) 반영 ----------
// 목록/상세에 날짜가 없는 목록형 게시판(교육자료실)의 최신 글 몇 건은 메인 페이지에 날짜가 노출된다.
const mainPreviewDates = new Map<number, string>()
try {
  const main = await fetchHtml('/main/main.html') // Phase 0 캐시 (네트워크 없음)
  const re = /class="date">\[(\d{4}\.\d{2}\.\d{2})\][\s\S]{0,400}?boardID=(www\d+)&num=(\d+)&Mode=view/g
  for (const m of main.html.matchAll(re)) mainPreviewDates.set(Number(m[3]), m[1]!)
} catch {
  // 캐시가 없으면 건너뜀
}
let fromMainPreview = 0
for (const p of posts) {
  const d = mainPreviewDates.get(p.num)
  if (d && (!p.date || p.dateSource === 'interpolated')) {
    p.date = d
    p.dateSource = 'view' // 사이트가 표시한 실제 등록일
    fromMainPreview += 1
    writeFileSync(join(postsDir, p.boardID, `${p.num}.json`), JSON.stringify(p, null, 2))
  }
}

// ---------- 날짜 근사 (전 게시판 공통 일련번호 num 기준 선형 보간) ----------
const toDays = (d: string) => Date.parse(d.replace(/\./g, '-')) / 86400000
const fromDays = (n: number) => {
  const d = new Date(n * 86400000)
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
}
const known = posts.filter((p) => p.date && p.dateSource !== 'interpolated').map((p) => ({ num: p.num, days: toDays(p.date!) })).sort((a, b) => a.num - b.num)
let interpolated = 0
for (const p of posts) {
  if (p.date && p.dateSource !== 'interpolated') continue
  const lower = [...known].reverse().find((k) => k.num < p.num)
  const upper = known.find((k) => k.num > p.num)
  let est: number | null = null
  if (lower && upper) est = lower.days + ((upper.days - lower.days) * (p.num - lower.num)) / (upper.num - lower.num)
  else if (lower) est = lower.days
  else if (upper) est = upper.days
  if (est !== null) {
    p.date = fromDays(Math.round(est))
    p.dateSource = 'interpolated'
    interpolated += 1
    writeFileSync(join(postsDir, p.boardID, `${p.num}.json`), JSON.stringify(p, null, 2))
  }
}

// ---------- 집계 ----------
const okFiles = (arr: FileRecord[]) => arr.filter((f) => f.ok && f.local)
const sum = (arr: FileRecord[]) => okFiles(arr).reduce((n, f) => n + (f.bytes ?? 0), 0)

const staticImages = pages.flatMap((p) => p.images)
const staticAttach = pages.flatMap((p) => p.attachments)
const albumPhotos = posts.flatMap((p) => p.photos)
const nonImageAttach = posts.flatMap((p) => p.attachments.filter((a) => !a.isImage).map((a) => a.file).filter((f): f is FileRecord => !!f))

const collected = posts.filter((p) => p.photosCollected && p.photos.length > 0)
// 미수집 = 예산 컷오프(사진 0장), 부분 수집 = 원본 서버 404 등으로 일부만 받힌 글
const partialOrigin = posts.filter((p) => !p.photosCollected && p.photos.some((f) => f.ok))
const pending = posts.filter((p) => !p.photosCollected && !p.photos.some((f) => f.ok))
const noPhoto = posts.filter((p) => p.photos.length === 0)
const state = existsSync(join(OUT_DIR, 'phase1-state.json')) ? readJson<{ cutoff: unknown; budgetBytes: number; finished: boolean }>(join(OUT_DIR, 'phase1-state.json')) : null

const byBoard = new Map<string, { boardID: string; label: string | null; posts: number; collectedPosts: number; pendingPosts: number; noPhotoPosts: number; photoFiles: number; photoBytes: number; pendingPhotoUrls: number; attachFiles: number; attachBytes: number; comments: number; oldest: string | null; newest: string | null; dateSources: Record<string, number> }>()
for (const p of posts) {
  const b = byBoard.get(p.boardID) ?? { boardID: p.boardID, label: p.boardLabel, posts: 0, collectedPosts: 0, pendingPosts: 0, noPhotoPosts: 0, photoFiles: 0, photoBytes: 0, pendingPhotoUrls: 0, attachFiles: 0, attachBytes: 0, comments: 0, oldest: null, newest: null, dateSources: {} }
  b.posts += 1
  if (p.photosCollected && p.photos.length > 0) b.collectedPosts += 1
  if (!p.photosCollected) {
    b.pendingPosts += 1
    b.pendingPhotoUrls += p.photos.length
  }
  if (p.photos.length === 0) b.noPhotoPosts += 1
  b.photoFiles += okFiles(p.photos).length
  b.photoBytes += sum(p.photos)
  const att = p.attachments.filter((a) => !a.isImage).map((a) => a.file).filter((f): f is FileRecord => !!f)
  b.attachFiles += okFiles(att).length
  b.attachBytes += sum(att)
  b.comments += p.comments.length
  if (p.date) {
    if (!b.oldest || p.date < b.oldest) b.oldest = p.date
    if (!b.newest || p.date > b.newest) b.newest = p.date
  }
  const ds = p.dateSource ?? 'none'
  b.dateSources[ds] = (b.dateSources[ds] ?? 0) + 1
  byBoard.set(p.boardID, b)
}

// 실패 목록
const failures = existsSync(join(DATA_DIR, 'failures.jsonl'))
  ? readFileSync(join(DATA_DIR, 'failures.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as { url: string; reason: string; at: string })
  : []
const fileFailures = [
  ...staticImages.filter((f) => !f.ok).map((f) => ({ kind: 'static-image', url: f.url, reason: f.reason })),
  ...albumPhotos.filter((f) => !f.ok && f.reason !== 'budget-cutoff').map((f) => ({ kind: 'photo', url: f.url, reason: f.reason })),
  ...nonImageAttach.filter((f) => !f.ok).map((f) => ({ kind: 'attachment', url: f.url, reason: f.reason })),
]

// url-map: 원본 URL → 로컬 경로 (Phase 2/3 에서 src 치환용)
const urlMap: Record<string, string> = {}
for (const f of [...staticImages, ...staticAttach, ...albumPhotos, ...nonImageAttach]) if (f.ok && f.local) urlMap[f.url] = f.local

const storage = existsSync(join(OUT_DIR, 'storage-usage.json')) ? readJson<{ totalBytes: number; buckets: Array<{ bucket: string; public: boolean; files: number; bytes: number }> }>(join(OUT_DIR, 'storage-usage.json')) : null

const totals = {
  albumPhotos: { files: okFiles(albumPhotos).length, bytes: sum(albumPhotos) },
  staticImages: { files: okFiles(staticImages).length, bytes: sum(staticImages) },
  staticAttachments: { files: okFiles(staticAttach).length, bytes: sum(staticAttach) },
  nonImageAttachments: { files: okFiles(nonImageAttach).length, bytes: sum(nonImageAttach) },
}
const grandBytes = totals.albumPhotos.bytes + totals.staticImages.bytes + totals.staticAttachments.bytes + totals.nonImageAttachments.bytes
const FREE_LIMIT = 1024 * 1024 * 1024

const cutoffPost = state?.cutoff as { num: number; boardID: string; title: string | null; date: string | null; postBytes: number } | null
const report = {
  generatedAt: new Date().toISOString(),
  finished: state?.finished ?? false,
  posts: {
    total: posts.length,
    photosCollected: collected.length,
    photosPending: pending.length,
    partialOrigin: partialOrigin.map((p) => ({ boardID: p.boardID, num: p.num, title: p.title, date: p.date, ok: p.photos.filter((f) => f.ok).length, total: p.photos.length })),
    noPhoto: noPhoto.length,
    interpolatedDates: interpolated,
    datesFromMainPreview: fromMainPreview,
    withComments: posts.filter((p) => p.comments.length > 0).length,
  },
  cutoff: cutoffPost
    ? { ...cutoffPost, oldestCollectedNum: collected.length ? Math.min(...collected.map((p) => p.num)) : null, oldestCollectedDate: collected.length ? collected.map((p) => p.date).filter(Boolean).sort()[0] : null }
    : null,
  staticPages: pages.length,
  byBoard: [...byBoard.values()].sort((a, b) => a.boardID.localeCompare(b.boardID)),
  totals,
  grandBytes,
  storage: storage
    ? { currentBytes: storage.totalBytes, buckets: storage.buckets, afterUploadBytes: storage.totalBytes + grandBytes, fitsFreePlan: storage.totalBytes + grandBytes <= FREE_LIMIT, freeLimitBytes: FREE_LIMIT }
    : null,
  failures: { requests: failures, files: fileFailures },
}
writeFileSync(join(OUT_DIR, 'phase1-report.json'), JSON.stringify(report, null, 2))
writeFileSync(join(OUT_DIR, 'url-map.json'), JSON.stringify(urlMap, null, 2))
writeFileSync(
  join(OUT_DIR, 'photo-pending.json'),
  JSON.stringify(
    [...pending, ...partialOrigin].map((p) => ({
      boardID: p.boardID,
      num: p.num,
      title: p.title,
      date: p.date,
      reason: p.photos.some((f) => f.ok) ? 'partial-origin-404' : 'budget-cutoff',
      photoUrls: p.photos.filter((f) => !f.ok).map((f) => f.url),
    })),
    null,
    2
  )
)

// ---------- 콘솔 ----------
console.log(`=== Phase 1 리포트 (${report.finished ? '완료' : '진행 중/중단'}) ===`)
console.log(`글 ${posts.length}건: 사진 수집 ${collected.length} / 미수집(예산) ${pending.length} / 부분 수집(원본 404) ${partialOrigin.length} / 사진 없는 글 ${noPhoto.length}`)
console.log(`날짜: 메인 미리보기 반영 ${fromMainPreview}건, 근사(interpolated) ${interpolated}건 / 댓글 있는 글 ${report.posts.withComments}건`)
for (const p of partialOrigin) console.log(`  부분 수집: ${p.boardID} #${p.num} «${p.title}» ${p.date} ${p.photos.filter((f) => f.ok).length}/${p.photos.length}`)
if (report.cutoff) console.log(`컷오프: ${report.cutoff.boardID} #${report.cutoff.num} «${report.cutoff.title}» ${report.cutoff.date} (이 글 ${mb(report.cutoff.postBytes)}MB) — 수집된 가장 오래된 글 #${report.cutoff.oldestCollectedNum} ${report.cutoff.oldestCollectedDate}`)
console.log('\nboardID  라벨        글수  수집  미수집  무사진  사진파일   사진MB  미수집URL  첨부  첨부MB  댓글  기간')
for (const b of report.byBoard) {
  console.log(`${b.boardID.padEnd(8)} ${(b.label ?? '').padEnd(10)} ${String(b.posts).padStart(4)} ${String(b.collectedPosts).padStart(5)} ${String(b.pendingPosts).padStart(6)} ${String(b.noPhotoPosts).padStart(6)} ${String(b.photoFiles).padStart(8)} ${mb(b.photoBytes).padStart(8)} ${String(b.pendingPhotoUrls).padStart(9)} ${String(b.attachFiles).padStart(5)} ${mb(b.attachBytes).padStart(7)} ${String(b.comments).padStart(5)}  ${b.oldest ?? '-'}~${b.newest ?? '-'}`)
}
console.log('\n=== 용량 합계 ===')
console.log(`앨범 사진        ${String(totals.albumPhotos.files).padStart(6)} files ${mb(totals.albumPhotos.bytes).padStart(8)} MB`)
console.log(`정적 페이지 이미지 ${String(totals.staticImages.files).padStart(6)} files ${mb(totals.staticImages.bytes).padStart(8)} MB`)
console.log(`비이미지 첨부     ${String(totals.nonImageAttachments.files).padStart(6)} files ${mb(totals.nonImageAttachments.bytes).padStart(8)} MB`)
console.log(`합계                             ${mb(grandBytes).padStart(8)} MB`)
if (report.storage) {
  console.log('\n=== Supabase Storage ===')
  for (const b of report.storage.buckets) console.log(`  ${b.bucket.padEnd(20)} ${b.public ? 'public ' : 'private'} ${b.files} files ${mb(b.bytes)} MB`)
  console.log(`  현재 ${mb(report.storage.currentBytes)} MB + 이관 ${mb(grandBytes)} MB = ${mb(report.storage.afterUploadBytes)} MB → 무료 1024 MB ${report.storage.fitsFreePlan ? '안에 들어감' : '초과'}`)
}
console.log(`\n=== 실패 ===\n요청 실패 ${failures.length}건, 파일 실패 ${fileFailures.length}건`)
for (const f of failures.slice(0, 30)) console.log(`  ${f.at.slice(11, 19)} ${f.reason} ${f.url}`)
for (const f of fileFailures.slice(0, 30)) console.log(`  [${f.kind}] ${f.reason} ${f.url}`)
