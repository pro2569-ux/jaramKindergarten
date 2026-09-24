/**
 * Phase 8. 이관 HTML 정리 (PR C) — posts(이관 글 68건)·pages(이관 richtext 4건)의 본문에서 옛 에디터/HWP 잔재를 걷어낸다.
 *   node scripts/migrate-jaramk/phase8-clean-html.ts                     dry-run(기본): 규칙별 통계·전후 길이·샘플 diff 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase8-clean-html.ts --apply             실제 반영. 반영 전에 대상 행의 content 전체를 백업
 *   node scripts/migrate-jaramk/phase8-clean-html.ts --rollback <백업.json>   백업 시점의 content 로 되돌리기
 *   옵션: --sample 5    dry-run 에서 보여줄 샘플 수
 *
 * 규칙 (검수 보고서 PR C)
 * - 인라인 style: font-family / font-size / color / line-height / letter-spacing / mso-* 제거.
 *   표 셀·표의 배경·테두리·패딩·정렬·폭, 이미지 폭·정렬, text-align 은 유지
 * - <font> 태그 풀기, 속성이 남지 않은 <span> 풀기, 중첩 <span> 평탄화
 * - class 제거: HWP(바탕글, 숫자), 옛 스킨(Skin_*, TopBg, SubCon, FootBg, h30, Text, Img*, S_img*, style*, text*) 등 전부
 *   (legacy-full / legacy-pagemaker / table-scroll 만 유지). li.moduleConTitle 은 <h2> 로, 옛 스킨 목록(ul.h30) 은 풀어서 문단으로
 * - 빈 문단(<p>&nbsp;</p>, 빈 div) 연속은 1개만, 연속 <br> 은 2개까지
 * - 본문 첫 줄이 제목과 같으면 제거 (제목 중복)
 * - 표·이미지·링크·본문 내용은 그대로. 결과는 lib/sanitize.ts 를 다시 통과시켜 저장
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const SAMPLE_IDX = process.argv.indexOf('--sample')
const SAMPLES = SAMPLE_IDX >= 0 ? Number(process.argv[SAMPLE_IDX + 1] ?? 3) : 3
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'clean-html')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

const DROP_STYLE_PROPS = new Set(['font-family', 'font-size', 'color', 'line-height', 'letter-spacing', 'font', 'font-style', 'font-weight', 'text-indent', 'word-break', 'word-spacing', 'background', 'background-color'])
/** 표·이미지에서는 배경·폭을 유지한다 */
const KEEP_ON_TABLE = new Set(['background', 'background-color', 'width', 'height', 'border', 'border-collapse', 'border-spacing', 'border-color', 'border-width', 'border-style', 'border-top', 'border-right', 'border-bottom', 'border-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'text-align', 'vertical-align'])
const KEEP_ON_IMG = new Set(['width', 'height', 'max-width', 'display', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'float'])
const KEEP_GENERAL = new Set(['text-align', 'width', 'max-width', 'margin', 'margin-left', 'margin-right', 'padding-left'])
const KEEP_CLASSES = new Set(['legacy-full', 'legacy-pagemaker', 'table-scroll'])

export interface CleanStats {
  styleProps: number
  stylesEmptied: number
  fontTags: number
  spansUnwrapped: number
  classesRemoved: number
  emptyBlocksRemoved: number
  brCollapsed: number
  moduleTitles: number
  titleDupRemoved: number
}
const emptyStats = (): CleanStats => ({ styleProps: 0, stylesEmptied: 0, fontTags: 0, spansUnwrapped: 0, classesRemoved: 0, emptyBlocksRemoved: 0, brCollapsed: 0, moduleTitles: 0, titleDupRemoved: 0 })

function isBlank(text: string): boolean {
  return text.replace(/ |&nbsp;/g, ' ').trim() === ''
}

export function cleanHtml(html: string, title: string | null): { html: string; stats: CleanStats } {
  const stats = emptyStats()
  const $ = cheerio.load(html, null, false)

  // 1) 옛 스킨 래퍼: li.moduleConTitle → h2, li.Text/ul.h30/Skin_ 컨테이너는 풀기
  $('li.moduleConTitle').each((_, el) => {
    const li = $(el)
    li.replaceWith(`<h2>${li.html() ?? ''}</h2>`)
    stats.moduleTitles += 1
  })
  for (let pass = 0; pass < 4; pass += 1) {
    $('ul.h30, ul.ul, li.Text, li.text01, div.TopBg, div.SubCon, div.FootBg, [class^="Skin_"]').each((_, el) => {
      const node = $(el)
      const tag = (el as Element).tagName?.toLowerCase()
      if (tag === 'li') node.replaceWith(`<div>${node.html() ?? ''}</div>`)
      else node.replaceWith(node.html() ?? '')
    })
  }

  // 2) 인라인 스타일 정리
  $('[style]').each((_, el) => {
    const node = $(el)
    const tag = (el as Element).tagName?.toLowerCase() ?? ''
    const style = node.attr('style') ?? ''
    const keep = tag === 'table' || tag === 'td' || tag === 'th' || tag === 'tr' || tag === 'col' ? KEEP_ON_TABLE : tag === 'img' || tag === 'figure' ? KEEP_ON_IMG : KEEP_GENERAL
    const kept: string[] = []
    for (const decl of style.split(';')) {
      const i = decl.indexOf(':')
      if (i < 0) continue
      const prop = decl.slice(0, i).trim().toLowerCase()
      const value = decl.slice(i + 1).trim()
      if (!prop || !value) continue
      if (prop.startsWith('mso-') || DROP_STYLE_PROPS.has(prop) && !keep.has(prop)) {
        stats.styleProps += 1
        continue
      }
      if (keep.has(prop) || (tag === 'img' && KEEP_ON_IMG.has(prop))) kept.push(`${prop}:${value}`)
      else stats.styleProps += 1
    }
    if (kept.length) node.attr('style', kept.join(';'))
    else {
      node.removeAttr('style')
      stats.stylesEmptied += 1
    }
  })

  // 3) <font> 풀기, 빈 <span> 풀기 (중첩 span 평탄화)
  $('font').each((_, el) => {
    $(el).replaceWith($(el).html() ?? '')
    stats.fontTags += 1
  })
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = 0
    $('span').each((_, el) => {
      const attrs = Object.keys((el as Element).attribs ?? {})
      if (attrs.length === 0) {
        $(el).replaceWith($(el).html() ?? '')
        changed += 1
      }
    })
    stats.spansUnwrapped += changed
    if (!changed) break
  }

  // 4) class 제거 (유지 목록 제외)
  $('[class]').each((_, el) => {
    const node = $(el)
    const classes = (node.attr('class') ?? '').split(/\s+/).filter(Boolean)
    const kept = classes.filter((c) => KEEP_CLASSES.has(c))
    if (kept.length !== classes.length) stats.classesRemoved += classes.length - kept.length
    if (kept.length) node.attr('class', kept.join(' '))
    else node.removeAttr('class')
  })
  // 속성이 남지 않은 div 는 p 로 (HWP 가 문단을 div 로 내보냄) — 블록 안에 블록이 있으면 그대로
  $('div').each((_, el) => {
    const node = $(el)
    if (Object.keys((el as Element).attribs ?? {}).length) return
    if (node.children('div, p, table, ul, ol, h1, h2, h3, h4, figure, blockquote').length) return
    node.replaceWith(`<p>${node.html() ?? ''}</p>`)
  })

  // 5) 제목 중복 (본문 첫 텍스트 블록이 제목과 같으면 제거)
  if (title) {
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    const first = $.root().children().first()
    if (first.length && norm(first.text()) === norm(title) && first.find('img, table').length === 0) {
      first.remove()
      stats.titleDupRemoved += 1
    }
  }

  // 6) 빈 블록 제거 (.content p 의 여백이 문단 간격을 대신한다), 블록 사이에 낀 <br> 제거, 연속 <br> 축소
  const BLOCK = new Set(['p', 'div', 'table', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'blockquote', 'hr'])
  $('p, div').each((_, el) => {
    const node = $(el)
    if (isBlank(node.text()) && node.find('img, table, br, hr, iframe, ul, ol').length === 0) {
      node.remove()
      stats.emptyBlocksRemoved += 1
    }
  })
  $.root()
    .children('br')
    .each((_, el) => {
      let prev: AnyNode | null = (el as Element).prev
      while (prev && prev.type === 'text' && !(prev as { data: string }).data.trim()) prev = prev.prev
      const prevIsBlock = !prev || (prev.type === 'tag' && BLOCK.has((prev as Element).name))
      if (prevIsBlock) {
        $(el).remove()
        stats.brCollapsed += 1
      }
    })
  // 연속 <br> 은 2개까지 (인접 선택자는 DOM 변경 뒤 불안정해 형제 노드를 직접 센다)
  $('br').each((_, el) => {
    let run = 0
    let prev: AnyNode | null = (el as Element).prev
    while (prev && ((prev.type === 'text' && !(prev as { data: string }).data.trim()) || (prev.type === 'tag' && (prev as Element).name === 'br'))) {
      if (prev.type === 'tag') run += 1
      prev = prev.prev
    }
    if (run >= 2) {
      $(el).remove()
      stats.brCollapsed += 1
    }
  })

  const out = sanitizeHtml($.root().html() ?? '')
  return { html: out, stats }
}

interface Row { id: string; slug?: string; title: string; content: string | null; legacy_meta: Record<string, unknown> | null }
type Plan = Array<{ table: 'posts' | 'pages'; id: string; label: string; before: number; after: number; stats: CleanStats; html: string; sample?: { before: string; after: string } }>

async function loadTargets(): Promise<{ posts: Row[]; pages: Row[] }> {
  const { data: posts, error: e1 } = await db.from('posts').select('id, title, content, legacy_meta').not('legacy_source_url', 'is', null)
  if (e1) throw new Error(`posts 조회 실패: ${e1.message}`)
  const { data: pages, error: e2 } = await db.from('pages').select('id, slug, title, content, legacy_meta').not('legacy_source_url', 'is', null).eq('legacy_meta->>kind', 'richtext')
  if (e2) throw new Error(`pages 조회 실패: ${e2.message}`)
  return { posts: (posts ?? []) as Row[], pages: (pages ?? []) as Row[] }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) return rollback(ROLLBACK_FILE)

  const { posts, pages } = await loadTargets()
  const plan: Plan = []
  const total = emptyStats()
  const run = (table: 'posts' | 'pages', rows: Row[]) => {
    for (const r of rows) {
      const before = r.content ?? ''
      const { html, stats } = cleanHtml(before, r.title)
      if (html === before) continue
      for (const k of Object.keys(total) as Array<keyof CleanStats>) total[k] += stats[k]
      plan.push({ table, id: r.id, label: `${table}/${r.slug ?? r.id.slice(0, 8)} «${r.title}»`, before: before.length, after: html.length, stats, html })
    }
  }
  run('posts', posts)
  run('pages', pages)

  log(`대상: posts ${posts.length}건, pages(richtext) ${pages.length}건 → 바뀌는 행 ${plan.length}건`)
  log(`규칙별 합계: ${JSON.stringify(total)}`)
  const totalBefore = plan.reduce((n, p) => n + p.before, 0)
  const totalAfter = plan.reduce((n, p) => n + p.after, 0)
  log(`본문 길이 합계: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} 자 (${Math.round((1 - totalAfter / totalBefore) * 100)}% 감소)`)
  const jaramk = plan.filter((p) => /jaramk\.com/i.test(p.html)).length
  log(`jaramk.com 잔존: ${jaramk}건`)
  for (const p of plan.slice(0, SAMPLES)) {
    log(`\n--- 샘플 ${p.label} (${p.before} → ${p.after}자) ${JSON.stringify(p.stats)}`)
    const src = [...posts, ...pages].find((r) => r.id === p.id)!
    log(`  전: ${(src.content ?? '').replace(/\s+/g, ' ').slice(0, 400)}`)
    log(`  후: ${p.html.replace(/\s+/g, ' ').slice(0, 400)}`)
  }
  const planPath = join(OUT, `plan-${stamp()}.json`)
  writeFileSync(planPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, total, rows: plan.map((p) => ({ table: p.table, id: p.id, label: p.label, before: p.before, after: p.after, stats: p.stats })) }, null, 2))
  log(`\n계획 저장: ${planPath}`)
  if (jaramk > 0) {
    log('jaramk.com 이 남는 행이 있어 반영하지 않습니다.')
    process.exit(2)
  }
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }

  const backupPath = join(OUT, `backup-${stamp()}.json`)
  const all = [...posts.map((r) => ({ table: 'posts' as const, ...r })), ...pages.map((r) => ({ table: 'pages' as const, ...r }))]
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: all.filter((r) => plan.some((p) => p.id === r.id)).map((r) => ({ table: r.table, id: r.id, title: r.title, content: r.content })) }, null, 2))
  log(`백업 저장 (content 전체): ${backupPath}`)
  let n = 0
  for (const p of plan) {
    const { error } = await db.from(p.table).update({ content: p.html }).eq('id', p.id)
    if (error) throw new Error(`${p.label} 반영 실패: ${error.message}`)
    n += 1
    if (n % 20 === 0) log(`  ${n}/${plan.length}`)
  }
  log(`완료 ${n}행. 되돌리기: --rollback ${backupPath}`)
}

async function rollback(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`백업 파일 없음: ${file}`)
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { rows: Array<{ table: 'posts' | 'pages'; id: string; content: string | null }> }
  let n = 0
  for (const r of backup.rows) {
    const { error } = await db.from(r.table).update({ content: r.content }).eq('id', r.id)
    if (error) throw new Error(`${r.table} ${r.id} 복원 실패: ${error.message}`)
    n += 1
  }
  log(`복원 완료: ${n}행`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? (e.stack ?? e.message) : e)
  process.exit(1)
})
