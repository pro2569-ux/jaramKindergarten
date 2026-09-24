/**
 * Phase 9. pageMaker 페이지 텍스트 재작성 (E2) — E1 에서 통짜 이미지 1장으로 바꿔 둔 이관 페이지 16개의 본문을
 * 원본 이미지의 글자를 그대로 옮겨 적은 HTML(scripts/migrate-jaramk/pagemaker-text/<pageCode>.html)로 교체한다.
 * 본문 끝에는 E1 에서 올린 원본 페이지 이미지(publicImage/legacy/pagemaker-full/<code>.webp) 링크 문단을 붙인다.
 *   node scripts/migrate-jaramk/phase9-pagemaker-text.ts                     dry-run(기본): 바뀔 행·검사 결과 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase9-pagemaker-text.ts --apply             실제 반영. 반영 전에 대상 행의 content 전체를 백업
 *   node scripts/migrate-jaramk/phase9-pagemaker-text.ts --rollback <백업.json>   백업 시점의 content 로 되돌리기
 *   옵션: --only 65,8        지정 pageCode 만 계획/반영
 *
 * 원칙
 * - 대상 행은 pages.legacy_source_url (= http://jaramk.com/main/sub.html?pageCode=<n>) 로 찾는다
 * - is_published 는 절대 바꾸지 않는다 (67 오시는길은 비공개 그대로)
 * - 새 본문 = 전사 HTML + 원본 이미지 링크 문단. lib/sanitize.ts 를 통과시킨 결과를 저장하며
 *   (1) 다시 통과시켜도 같은지(멱등) (2) 태그를 걷어낸 텍스트가 전사본과 같은지(내용 손실 없음) 를 검사한다
 * - 원본 이미지 URL 은 HEAD 로 존재를 확인한다
 * - 이미 같은 본문인 행은 건너뛴다 (재실행 안전). 문제(problems)가 하나라도 있으면 --apply 중단
 * - 계획/백업은 리포 안 gitignore 폴더(scripts/migrate-jaramk/data/out/pagemaker-text)에 둔다
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as cheerio from 'cheerio'
import { adminClient, supabaseUrl } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ROLLBACK_IDX = args.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (args[ROLLBACK_IDX + 1] ?? null) : null
const ONLY_IDX = args.indexOf('--only')
const ONLY = ONLY_IDX >= 0 && args[ONLY_IDX + 1] ? new Set(args[ONLY_IDX + 1]!.split(',').map((s) => Number(s.trim()))) : null

const TEXT_DIR = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'pagemaker-text')
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'pagemaker-text')
const BUCKET = 'publicImage'
const OBJECT_PREFIX = 'legacy/pagemaker-full'
const PAGE_URL = (code: number) => `http://jaramk.com/main/sub.html?pageCode=${code}`
const IMAGE_URL = (code: number) => `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${OBJECT_PREFIX}/${code}.webp`
/** pageMaker 캡처본이 없는 페이지(원래 richtext 페이지) — 원본 이미지 링크를 붙이지 않는다 */
const NO_ORIGINAL_IMAGE = new Set<number>([4, 5])
/** 디자인 재구성(PR H)에서 빠져도 되는 표 머리글 등 구조 낱말 — 이 외의 낱말·숫자가 빠지면 반영 중단 */
const ALLOWED_DROPS = new Set(['구분', '인원', '월', '절기', '내용', '놀이프로그램', '시간', '활동내용'])
/** 같은 경로를 정적 라우트가 먼저 받는 페이지 — DB 는 갱신하되 화면 반영은 라우트 쪽 */
const STATIC_ROUTE: Record<number, string> = {
  66: '/about/teachers 정적 라우트가 우선 — 라우트가 이 행의 content 를 "글로 보기" 로 함께 보여줌',
  67: '/about/location 정적 라우트(지도)가 우선이고 행은 비공개 — 백업용 텍스트',
}

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length
/** 보이는 텍스트. 블록 요소 경계에는 공백을 넣고(셀·항목이 붙지 않게), 인라인 강조 태그는 붙여 읽는다 (4<small>명</small> → 4명) */
const textOf = (html: string) =>
  cheerio
    .load(html.replace(/<(?!\/?(?:small|strong|b|em|i|u|s|a|sup|sub|mark)\b)/gi, ' <'), null, false)
    .root()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
/** 내용 보존 검사용 낱말 집합: 한글·영문·숫자 덩어리 (기호·공백 제거) */
const tokensOf = (text: string) => new Set((text.replace(/[​﻿]/g, '').match(/[가-힣A-Za-z0-9:~.%()/·-]+/g) ?? []).map((t) => t.replace(/^[().:~·/-]+|[().:~·/-]+$/g, '')).filter((t) => t.length >= 1 && !/^[.:~·/()-]*$/.test(t)))

interface PageRow {
  id: string
  slug: string
  title: string
  content: string | null
  is_published: boolean
  legacy_source_url: string | null
  updated_at: string | null
}
interface Change {
  pageCode: number
  id: string
  slug: string
  title: string
  is_published: boolean
  before: { length: number; imgs: number; legacyFull: boolean }
  after: string
  stats: { chars: number; headings: number; lists: number; tables: number }
  notes: string[]
}
interface Plan {
  changes: Change[]
  skipped: Array<{ pageCode: number; reason: string }>
  problems: string[]
}

const db = adminClient()

function listCodes(): number[] {
  if (!existsSync(TEXT_DIR)) throw new Error(`전사본 폴더 없음: ${TEXT_DIR}`)
  return readdirSync(TEXT_DIR)
    .filter((f) => /^\d+\.html$/.test(f))
    .map((f) => Number(f.replace('.html', '')))
    .filter((c) => !ONLY || ONLY.has(c))
    .sort((a, b) => a - b)
}

/** 전사 HTML + 원본 이미지 링크 문단. 저장본은 sanitize 를 통과시킨 결과 */
function compose(code: number, transcript: string): string {
  if (NO_ORIGINAL_IMAGE.has(code)) return transcript.trim()
  const link = `<p class="legacy-source"><a href="${escapeAttr(IMAGE_URL(code))}" target="_blank" rel="noopener noreferrer">원본 페이지 이미지 보기</a></p>`
  return `${transcript.trim()}\n${link}`
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

async function buildPlan(codes: number[], rows: Map<string, PageRow>): Promise<Plan> {
  const plan: Plan = { changes: [], skipped: [], problems: [] }
  for (const code of codes) {
    const row = rows.get(PAGE_URL(code))
    if (!row) {
      plan.problems.push(`${code}: pages 에 legacy_source_url=${PAGE_URL(code)} 인 행 없음`)
      continue
    }
    const transcript = readFileSync(join(TEXT_DIR, `${code}.html`), 'utf8')
    if (textOf(transcript).length < 20) {
      plan.problems.push(`${code} ${row.title}: 전사본이 비어 있음`)
      continue
    }
    const composed = compose(code, transcript)
    const after = sanitizeHtml(composed)
    if (sanitizeHtml(after) !== after) {
      plan.problems.push(`${code} ${row.title}: sanitize 결과가 멱등이 아님`)
      continue
    }
    if (textOf(after) !== textOf(composed)) {
      plan.problems.push(`${code} ${row.title}: sanitize 후 텍스트가 달라짐 (허용되지 않는 태그/속성이 있는지 확인)\n    전: ${textOf(composed).slice(0, 200)}\n    후: ${textOf(after).slice(0, 200)}`)
      continue
    }
    if (!NO_ORIGINAL_IMAGE.has(code)) {
      const head = await fetch(IMAGE_URL(code), { method: 'HEAD' })
      if (!head.ok) {
        plan.problems.push(`${code} ${row.title}: 원본 이미지 URL 확인 실패 HTTP ${head.status} ${IMAGE_URL(code)}`)
        continue
      }
    }
    if ((row.content ?? '') === after) {
      plan.skipped.push({ pageCode: code, reason: '이미 새 본문과 같음' })
      continue
    }
    // 내용 보존 검사: 현재 본문의 낱말·숫자가 새 본문에 모두 있어야 한다 (디자인만 바뀌고 내용은 그대로)
    const newTokens = tokensOf(textOf(after))
    const missing = [...tokensOf(textOf(row.content ?? ''))].filter((t) => !newTokens.has(t) && !ALLOWED_DROPS.has(t) && t !== '원본' && t !== '페이지' && t !== '이미지' && t !== '보기')
    if (missing.length > 0) {
      plan.problems.push(`${code} ${row.title}: 현재 본문의 낱말이 새 본문에 없음 (${missing.length}개): ${missing.slice(0, 30).join(', ')}`)
      continue
    }
    const notes: string[] = []
    if (!row.is_published) notes.push('비공개 페이지 (is_published 유지)')
    if (STATIC_ROUTE[code]) notes.push(STATIC_ROUTE[code]!)
    const legacyFull = /class="legacy-full"/.test(row.content ?? '')
    if (!legacyFull) notes.push('현재 본문이 E1 형식(legacy-full)이 아님 — 백업 확인 후 반영')
    plan.changes.push({
      pageCode: code, id: row.id, slug: row.slug, title: row.title, is_published: row.is_published,
      before: { length: (row.content ?? '').length, imgs: count(row.content ?? '', /<img\b/gi), legacyFull },
      after,
      stats: { chars: textOf(after).length, headings: count(after, /<h[23]\b/gi), lists: count(after, /<[uo]l\b/gi), tables: count(after, /<table\b/gi) },
      notes,
    })
  }
  return plan
}

function printPlan(plan: Plan): void {
  log(`== pages.content 교체 ${plan.changes.length}행`)
  for (const c of plan.changes) {
    log(`- [${c.pageCode}] ${c.slug} "${c.title}" ${c.is_published ? '공개' : '비공개'} | 현재 ${c.before.length}자, <img> ${c.before.imgs}장${c.before.legacyFull ? ' (E1 통짜 이미지)' : ''} → 새 본문 ${c.after.length}자: 글자 ${c.stats.chars}, 제목 ${c.stats.headings}, 목록 ${c.stats.lists}, 표 ${c.stats.tables}${c.notes.length ? '  # ' + c.notes.join('; ') : ''}`)
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

async function apply(plan: Plan, rows: Map<string, PageRow>): Promise<void> {
  if (plan.problems.length > 0) {
    log('문제가 있어 반영하지 않습니다.')
    process.exit(2)
  }
  if (plan.changes.length === 0) {
    log('바뀌는 행이 없습니다.')
    return
  }
  mkdirSync(OUT, { recursive: true })
  const byId = new Map<string, PageRow>([...rows.values()].map((r) => [r.id, r]))
  const backupPath = join(OUT, `backup-${stamp()}.json`)
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
  log(`완료 ${plan.changes.length}행. 페이지 캐시(60초)가 지나면 반영됩니다. 되돌리기: --rollback ${backupPath}`)
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
  const codes = listCodes()
  const rows = await loadRows(codes.map(PAGE_URL))
  log(`전사본 ${codes.length}페이지 (${codes.join(', ')}), DB 에서 찾은 행 ${rows.size}`)
  const plan = await buildPlan(codes, rows)
  printPlan(plan)
  mkdirSync(OUT, { recursive: true })
  const planPath = join(OUT, `plan-${stamp()}.json`)
  writeFileSync(planPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, changes: plan.changes, skipped: plan.skipped, problems: plan.problems }, null, 2))
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
