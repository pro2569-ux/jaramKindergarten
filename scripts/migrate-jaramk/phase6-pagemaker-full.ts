/**
 * Phase 6b. pageMaker 페이지 통짜 이미지 교체 — 조각 이미지 54~89장으로 깨져 보이는 이관 페이지 본문을
 * 원본 페이지를 통째로 캡처한 이미지 1장(<figure><img>)으로 바꾼다. 캡처는 phase6-capture.ts 가 먼저 만든다.
 *   node scripts/migrate-jaramk/phase6-pagemaker-full.ts --upload            캡처본(webp)을 publicImage 버킷에 올리고 manifest 에 공개 URL 기록 (upsert, 삭제 없음)
 *   node scripts/migrate-jaramk/phase6-pagemaker-full.ts                     dry-run(기본): 바뀔 행과 새 본문을 출력, DB 변경 없음. out/pagemaker-full/plan-<ts>.json 저장
 *   node scripts/migrate-jaramk/phase6-pagemaker-full.ts --apply             실제 반영(승인 후). 반영 전에 대상 행의 content 전체를 백업
 *   node scripts/migrate-jaramk/phase6-pagemaker-full.ts --rollback <백업.json>   백업 시점의 content 로 되돌리기
 *   옵션: --only 65,8        지정 pageCode 만 계획/반영
 *         --include-excluded 기본 제외 페이지(67 오시는길: 비공개 + 정적 라우트)도 포함
 *
 * 원칙
 * - 대상 행은 pages.legacy_source_url (= 원본 URL http://jaramk.com/main/sub.html?pageCode=<n>) 로 찾는다
 * - 66(교원/반편성)은 캡처하지 않고 사이트의 완성 이미지 public/images/teacher.png 를 WebP 로 변환해 같은 버킷에 올린다
 * - 표시 폭: width:100%; max-width:900px (본문 폭 안에서 최대 900px, 모바일은 화면 폭)
 * - 계획/백업 파일은 리포 안 gitignore 폴더(scripts/migrate-jaramk/data/out/pagemaker-full)에 둔다.
 *   수집 데이터 폴더(JARAMK_DATA_DIR)는 읽기만 한다 (manifest 는 --upload 때만 갱신)
 * - 새 본문은 lib/sanitize.ts 를 그대로 통과해야 한다 (dry-run 에서 검사; decoding 속성은 허용 목록에 없어 넣지 않음)
 * - 이미 새 본문과 같은 행은 건너뛴다 (재실행 안전)
 * - --apply 는 문제(problems)가 하나라도 있으면 중단한다
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { adminClient, supabaseUrl } from './lib/supabase-admin.ts'
import { DATA_DIR, REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'
import type { Manifest, ManifestEntry } from './phase6-capture.ts'

const args = process.argv.slice(2)
const UPLOAD = args.includes('--upload')
const APPLY = args.includes('--apply')
const INCLUDE_EXCLUDED = args.includes('--include-excluded')
const ROLLBACK_IDX = args.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (args[ROLLBACK_IDX + 1] ?? null) : null
const ONLY_IDX = args.indexOf('--only')
const ONLY = ONLY_IDX >= 0 && args[ONLY_IDX + 1] ? new Set(args[ONLY_IDX + 1]!.split(',').map((s) => Number(s.trim()))) : null

const BUCKET = 'publicImage'
const OBJECT_PREFIX = 'legacy/pagemaker-full'
const MAX_UPLOAD_BYTES = 700 * 1024 // 이 안에 들면 @2x, 아니면 @1x
const WARN_BYTES = 1024 * 1024
const FILES_DIR = join(DATA_DIR, 'files', 'pagemaker-full')
const MANIFEST = join(FILES_DIR, 'manifest.json')
/** 계획·백업·정적 변환본 출력 (리포 안, gitignore). 수집 데이터 폴더에는 쓰지 않는다 */
const PLAN_DIR = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'pagemaker-full')
/** 캡처 대신 사이트 정적 이미지를 WebP 로 변환해 쓰는 페이지 */
const STATIC_IMAGE: Record<number, { file: string; note: string }> = {
  66: { file: join(REPO_ROOT, 'public', 'images', 'teacher.png'), note: '캡처 대신 사이트 완성 이미지(public/images/teacher.png)를 WebP 로 변환해 업로드' },
}
const STATIC_WEBP_QUALITY = 85
/** 기본 계획에서 빼는 페이지 (--include-excluded 로 포함) */
const EXCLUDED: Record<number, string> = {
  67: '오시는길 — 비공개이고 /about/location 정적 라우트(지도)로 열림. 캡처본은 백업용',
}
const PAGE_URL = (code: number) => `http://jaramk.com/main/sub.html?pageCode=${code}`

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`
const imgCount = (html: string | null) => ((html ?? '').match(/<img\b/gi) ?? []).length
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface PageRow {
  id: string
  slug: string
  title: string
  content: string | null
  is_published: boolean
  legacy_source_url: string | null
  updated_at: string | null
}
interface Target {
  pageCode: number
  title: string
  slug: string // transformed/proposed slug (DB slug 는 legacy- 접두어가 붙었을 수 있음)
  sourceUrl: string
  src: string
  publicUrl: string | null // figcaption 링크 (정적 이미지는 null)
  cssWidth: number
  cssHeight: number
  bytes: number | null
  variant: string
  notes: string[]
}
interface Change {
  pageCode: number
  id: string
  slug: string
  title: string
  is_published: boolean
  before: { length: number; imgs: number }
  after: string
  notes: string[]
}
interface Plan {
  changes: Change[]
  skipped: Array<{ pageCode: number; reason: string }>
  problems: string[]
}

const db = adminClient()

function loadManifest(): Manifest {
  if (!existsSync(MANIFEST)) throw new Error(`manifest 없음: ${MANIFEST} — 먼저 phase6-capture.ts 를 실행`)
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest
}
function saveManifest(m: Manifest): void {
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2))
}

/** 새 본문. sanitize-html 이 내는 직렬화(<img … />)와 같게 써서 dry-run 의 왕복 검사가 정확히 같아지게 한다 */
function buildContent(t: Target): string {
  const alt = escapeAttr(`${t.title.endsWith('안내') ? t.title : `${t.title} 안내`} (원본 페이지 이미지)`)
  const img = `<img src="${escapeAttr(t.src)}" alt="${alt}" width="${t.cssWidth}" height="${t.cssHeight}" loading="lazy" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto" />`
  const caption = t.publicUrl
    ? `<figcaption style="text-align:center;margin-top:8px"><a href="${escapeAttr(t.publicUrl)}" target="_blank" rel="noopener noreferrer">이미지 크게 보기</a></figcaption>`
    : ''
  return `<figure class="legacy-full">${img}${caption}</figure>`
}

// ---------- 업로드 ----------
function chooseVariant(e: ManifestEntry): { variant: '2x' | '1x'; bytes: number; path: string } {
  const two = e.files['2x']!
  const one = e.files['1x']!
  if (two.bytes <= MAX_UPLOAD_BYTES) return { variant: '2x', bytes: two.bytes, path: two.path }
  return { variant: '1x', bytes: one.bytes, path: one.path }
}

async function upload(manifest: Manifest): Promise<void> {
  const base = `${supabaseUrl()}/storage/v1/object/public/${BUCKET}`
  let n = 0
  for (const e of manifest.pages) {
    if (ONLY && !ONLY.has(e.pageCode)) continue
    const v = chooseVariant(e)
    const objectPath = `${OBJECT_PREFIX}/${e.pageCode}.webp`
    const local = join(DATA_DIR, v.path)
    const body = readFileSync(local)
    if (body.length !== v.bytes) throw new Error(`${e.pageCode}: manifest 크기(${v.bytes})와 파일 크기(${body.length})가 다름 — 다시 캡처 필요`)
    const { error } = await db.storage.from(BUCKET).upload(objectPath, body, { contentType: 'image/webp', upsert: true })
    if (error) throw new Error(`${e.pageCode} 업로드 실패: ${error.message}`)
    const publicUrl = `${base}/${objectPath}`
    // 공개 URL 확인 (읽기)
    const res = await fetch(publicUrl, { method: 'HEAD' })
    const len = Number(res.headers.get('content-length') ?? -1)
    const ok = res.ok && (len === -1 || len === body.length)
    e.upload = { variant: v.variant, objectPath, publicUrl, bytes: body.length, uploadedAt: new Date().toISOString() }
    saveManifest(manifest)
    n++
    log(`  ${e.pageCode} ${e.title}: @${v.variant} ${kb(body.length)} → ${publicUrl} ${ok ? '(확인 OK)' : `(확인 실패: HTTP ${res.status}, content-length ${len})`}${body.length > WARN_BYTES ? ' ⚠ 1MB 초과' : ''}`)
  }
  log(`업로드 ${n}건 완료 → manifest 갱신`)
}

// ---------- 계획 ----------
async function buildTargets(manifest: Manifest): Promise<{ targets: Target[]; problems: string[]; skipped: Plan['skipped'] }> {
  const targets: Target[] = []
  const problems: string[] = []
  const skipped: Plan['skipped'] = []
  const codes = new Set<number>([...manifest.pages.map((p) => p.pageCode), ...Object.keys(STATIC_IMAGE).map(Number)])
  for (const code of [...codes].sort((a, b) => a - b)) {
    if (ONLY && !ONLY.has(code)) continue
    if (EXCLUDED[code] && !INCLUDE_EXCLUDED) {
      skipped.push({ pageCode: code, reason: EXCLUDED[code]! })
      continue
    }
    const st = STATIC_IMAGE[code]
    if (st) {
      const tp = join(DATA_DIR, 'transformed', 'pages', `${code}.json`)
      const meta = existsSync(tp) ? (JSON.parse(readFileSync(tp, 'utf8')) as { title: string; proposed: { slug: string } }) : null
      if (!existsSync(st.file)) {
        problems.push(`${code}: 정적 이미지 없음 ${st.file}`)
        continue
      }
      // PNG → WebP 변환 (원본 해상도 유지) 후 캡처본과 같은 버킷 경로에 업로드 (upsert, 공개 자산이라 dry-run 에서도 수행)
      mkdirSync(PLAN_DIR, { recursive: true })
      const webp = await sharp(st.file).webp({ quality: STATIC_WEBP_QUALITY }).toBuffer({ resolveWithObject: true })
      const webpPath = join(PLAN_DIR, `${code}.webp`)
      writeFileSync(webpPath, webp.data)
      const objectPath = `${OBJECT_PREFIX}/${code}.webp`
      const publicUrl = `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${objectPath}`
      const { error } = await db.storage.from(BUCKET).upload(objectPath, webp.data, { contentType: 'image/webp', upsert: true })
      if (error) {
        problems.push(`${code}: WebP 업로드 실패 ${error.message}`)
        continue
      }
      const head = await fetch(publicUrl, { method: 'HEAD' })
      if (!head.ok) {
        problems.push(`${code}: 업로드한 WebP 공개 URL 확인 실패 HTTP ${head.status}`)
        continue
      }
      log(`  ${code} 정적 이미지 → WebP ${webp.info.width}x${webp.info.height} ${kb(webp.data.byteLength)} 업로드: ${publicUrl}`)
      targets.push({
        pageCode: code, title: meta?.title ?? String(code), slug: meta?.proposed.slug ?? String(code), sourceUrl: PAGE_URL(code),
        src: publicUrl, publicUrl, cssWidth: webp.info.width, cssHeight: webp.info.height, bytes: webp.data.byteLength, variant: 'static→webp', notes: [st.note],
      })
      continue
    }
    const e = manifest.pages.find((p) => p.pageCode === code)!
    if (!e.upload) {
      problems.push(`${code}: 아직 업로드되지 않음 (--upload 먼저)`)
      continue
    }
    const notes = [...e.notes]
    if (e.upload.bytes > WARN_BYTES) notes.push(`이미지 ${kb(e.upload.bytes)} — 1MB 초과`)
    if (!e.containerSelector) notes.push('컨테이너를 못 찾아 페이지 전체 캡처본임')
    targets.push({
      pageCode: code, title: e.title, slug: e.slug, sourceUrl: e.sourceUrl,
      src: e.upload.publicUrl, publicUrl: e.upload.publicUrl, cssWidth: e.cssWidth, cssHeight: e.cssHeight, bytes: e.upload.bytes, variant: `@${e.upload.variant}`, notes,
    })
  }
  return { targets, problems, skipped }
}

async function loadRows(urls: string[]): Promise<Map<string, PageRow>> {
  const { data, error } = await db
    .from('pages')
    .select('id, slug, title, content, is_published, legacy_source_url, updated_at')
    .in('legacy_source_url', urls)
  if (error) throw new Error(`pages 조회 실패: ${error.message}`)
  const map = new Map<string, PageRow>()
  for (const r of (data ?? []) as PageRow[]) {
    if (r.legacy_source_url && map.has(r.legacy_source_url)) throw new Error(`legacy_source_url 중복: ${r.legacy_source_url}`)
    if (r.legacy_source_url) map.set(r.legacy_source_url, r)
  }
  return map
}

function buildPlan(targets: Target[], rows: Map<string, PageRow>, problems: string[], skipped: Plan['skipped']): Plan {
  const changes: Change[] = []
  for (const t of targets) {
    const row = rows.get(t.sourceUrl)
    if (!row) {
      problems.push(`${t.pageCode} ${t.title}: pages 에 legacy_source_url=${t.sourceUrl} 인 행 없음`)
      continue
    }
    const after = buildContent(t)
    const roundTrip = sanitizeHtml(after)
    if (roundTrip !== after) {
      problems.push(`${t.pageCode} ${t.title}: 새 본문이 sanitize 를 그대로 통과하지 못함\n    in : ${after}\n    out: ${roundTrip}`)
      continue
    }
    if ((row.content ?? '') === after) {
      skipped.push({ pageCode: t.pageCode, reason: '이미 새 본문과 같음' })
      continue
    }
    const notes = [...t.notes]
    if (/class="legacy-full"/.test(row.content ?? '')) notes.push('현재 본문이 이미 legacy-full 형식 (URL/크기만 갱신)')
    if (!row.is_published) notes.push('비공개 페이지')
    changes.push({
      pageCode: t.pageCode, id: row.id, slug: row.slug, title: row.title, is_published: row.is_published,
      before: { length: (row.content ?? '').length, imgs: imgCount(row.content) }, after, notes,
    })
  }
  return { changes, skipped, problems }
}

function printPlan(plan: Plan, targets: Target[]): void {
  log(`== pages.content 교체 ${plan.changes.length}행`)
  for (const c of plan.changes) {
    const t = targets.find((x) => x.pageCode === c.pageCode)!
    log(`- [${c.pageCode}] ${c.slug} "${c.title}" id=${c.id} ${c.is_published ? '공개' : '비공개'} | 현재 ${c.before.length}자, <img> ${c.before.imgs}장 → 새 본문 ${c.after.length}자, <img> 1장 (${t.cssWidth}x${t.cssHeight}, ${t.variant}${t.bytes !== null ? ' ' + kb(t.bytes) : ''})${c.notes.length ? '  # ' + c.notes.join('; ') : ''}`)
    log(`    ${c.after}`)
  }
  if (plan.skipped.length) {
    log()
    log(`== 건너뜀 ${plan.skipped.length}건`)
    for (const s of plan.skipped) log(`- [${s.pageCode}] ${s.reason}`)
  }
  if (plan.problems.length) {
    log()
    log(`== 문제 ${plan.problems.length}건 (해결 전 --apply 불가)`)
    for (const p of plan.problems) log(`- ${p}`)
  }
}

// ---------- 반영 / 되돌리기 ----------
async function apply(plan: Plan, rows: Map<string, PageRow>): Promise<void> {
  if (plan.problems.length > 0) {
    log('문제가 있어 반영하지 않습니다.')
    process.exit(2)
  }
  if (plan.changes.length === 0) {
    log('바뀌는 행이 없습니다.')
    return
  }
  mkdirSync(PLAN_DIR, { recursive: true })
  const byId = new Map<string, PageRow>([...rows.values()].map((r) => [r.id, r]))
  const backupPath = join(PLAN_DIR, `backup-${stamp()}.json`)
  const backup = {
    createdAt: new Date().toISOString(),
    rows: plan.changes.map((c) => {
      const r = byId.get(c.id)!
      return { id: r.id, slug: r.slug, title: r.title, legacy_source_url: r.legacy_source_url, is_published: r.is_published, updated_at: r.updated_at, content: r.content }
    }),
  }
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  log(`백업 저장 (content 전체): ${backupPath}`)
  for (const c of plan.changes) {
    const { error } = await db.from('pages').update({ content: c.after }).eq('id', c.id)
    if (error) throw new Error(`pages ${c.slug} 반영 실패: ${error.message}`)
    log(`pages ${c.slug} [${c.pageCode}]: content 교체`)
  }
  log(`완료 ${plan.changes.length}행. 페이지 캐시가 지나면 반영됩니다. 되돌리기: --rollback ${backupPath}`)
}

async function rollback(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`백업 파일 없음: ${file}`)
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { rows: Array<{ id: string; slug: string; content: string | null }> }
  const { data, error } = await db.from('pages').select('id, slug, content').in('id', backup.rows.map((r) => r.id))
  if (error) throw new Error(`pages 조회 실패: ${error.message}`)
  const cur = new Map<string, { content: string | null }>(((data ?? []) as Array<{ id: string; content: string | null }>).map((r) => [r.id, r]))
  let n = 0
  for (const b of backup.rows) {
    const c = cur.get(b.id)
    if (!c) {
      log(`pages ${b.slug}: 현재 없음 → 건너뜀`)
      continue
    }
    if (c.content === b.content) continue
    const { error: e2 } = await db.from('pages').update({ content: b.content }).eq('id', b.id)
    if (e2) throw new Error(`pages ${b.slug} 복원 실패: ${e2.message}`)
    log(`pages ${b.slug}: content 복원 (${(b.content ?? '').length}자)`)
    n++
  }
  log(`복원 완료: ${n}행`)
}

async function main(): Promise<void> {
  if (ROLLBACK_FILE) {
    await rollback(ROLLBACK_FILE)
    return
  }
  const manifest = loadManifest()
  if (UPLOAD) {
    await upload(manifest)
    return
  }
  const { targets, problems, skipped } = await buildTargets(manifest)
  const rows = await loadRows(targets.map((t) => t.sourceUrl))
  log(`대상 ${targets.length}페이지, DB 에서 찾은 행 ${rows.size}`)
  const plan = buildPlan(targets, rows, problems, skipped)
  printPlan(plan, targets)
  mkdirSync(PLAN_DIR, { recursive: true })
  const planPath = join(PLAN_DIR, `plan-${stamp()}.json`)
  writeFileSync(planPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, targets, changes: plan.changes, skipped: plan.skipped, problems: plan.problems }, null, 2))
  log()
  log(`계획 저장: ${planPath}`)
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  await apply(plan, rows)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
