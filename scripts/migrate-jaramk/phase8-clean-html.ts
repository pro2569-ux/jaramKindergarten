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
const ONLY_IDX = process.argv.indexOf('--only')
/** --only <slug|id 조각>: 해당 행만 대상으로 (검토용) */
const ONLY = ONLY_IDX >= 0 ? (process.argv[ONLY_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'clean-html')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

const DROP_STYLE_PROPS = new Set(['font-family', 'font-size', 'color', 'line-height', 'letter-spacing', 'font', 'font-style', 'font-weight', 'text-indent', 'word-break', 'word-spacing', 'background', 'background-color'])
/** 표·이미지에서는 배경·폭을 유지한다 */
const KEEP_ON_TABLE = new Set(['background', 'background-color', 'width', 'height', 'border', 'border-collapse', 'border-spacing', 'border-color', 'border-width', 'border-style', 'border-top', 'border-right', 'border-bottom', 'border-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'text-align', 'vertical-align'])
const KEEP_ON_IMG = new Set(['width', 'height', 'max-width', 'display', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'float'])
const KEEP_GENERAL = new Set(['text-align', 'width', 'max-width', 'margin', 'margin-left', 'margin-right', 'padding-left'])
const KEEP_CLASSES = new Set(['legacy-full', 'legacy-pagemaker', 'table-scroll', 'photo-grid'])

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
  /** PR G: 옛 목록형 사진 배치 → 사진 격자 */
  photoGrids: number
  /** PR G: 레이아웃용 <li>/<ul> 풀기 */
  layoutLists: number
  /** PR G: 고정 폭에 맞춰 줄마다 끊긴 문단 잇기 */
  linesMerged: number
}
const emptyStats = (): CleanStats => ({ styleProps: 0, stylesEmptied: 0, fontTags: 0, spansUnwrapped: 0, classesRemoved: 0, emptyBlocksRemoved: 0, brCollapsed: 0, moduleTitles: 0, titleDupRemoved: 0, photoGrids: 0, layoutLists: 0, linesMerged: 0 })

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** 문장이 끝난 문단 (부호 또는 한국어 종결 어미) */
const SENTENCE_END = /[.!?。…:;)\]」』"”'’]\s*$|(다|요|죠|음|함|임|됨|것)\s*$/
/** 글머리 기호·번호로 시작하는 줄 (잇지 않는다) */
const LIST_LIKE = /^\s*([-•·※▶►■□○●◆◇▷▪–—]|\d+[.)]|[①-⑳])/

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

  // 1b) 옛 레이아웃 목록 정리 (PR G) — 원본 스킨이 문단·표·사진을 <ul><li> 로 감싸 놓은 것을 푼다
  //  - 사진 격자: <ul><li><ul><li><img></li><li>설명</li></ul></li>…</ul> → <div class="photo-grid"><figure><img><figcaption>설명</figcaption></figure>…</div>
  //  - 부모가 ul/ol 이 아닌 고아 <li>, 블록(p/div/table/h*/목록)을 담은 <li>, 이미지만 담은 <li>, 빈 <li> → 목록 항목이 아니라 레이아웃 → 푼다
  //  - li 가 안 남은 목록은 풀고, 항목이 하나뿐인 목록은 문단으로
  const BLOCK_SEL = 'p, div, table, h1, h2, h3, h4, h5, h6, figure, blockquote, ul, ol'
  const isPhotoCard = (li: Element): boolean => {
    const kids = $(li).children()
    if (kids.length !== 1 || !kids.first().is('ul')) return false
    const inner = kids.first().children('li')
    if (inner.length < 1 || inner.length > 2) return false
    const first = inner.eq(0)
    if (first.children().length !== 1 || first.children('img').length !== 1 || !isBlank(first.text())) return false
    if (inner.length === 2 && inner.eq(1).children().length > 0) return false
    return true
  }
  $('ul').each((_, el) => {
    const ul = $(el)
    const items = ul.children('li')
    if (items.length === 0 || !items.toArray().every((li) => isPhotoCard(li as Element))) return
    const figures = items.toArray().map((li) => {
      const inner = $(li).children('ul').children('li')
      const img = $.html(inner.eq(0).children('img'))
      const caption = inner.length === 2 ? inner.eq(1).text().replace(/[​﻿]/g, '').trim() : ''
      return `<figure>${img}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`
    })
    ul.replaceWith(`<div class="photo-grid">${figures.join('')}</div>`)
    stats.photoGrids += 1
  })
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = 0
    $('li').each((_, el) => {
      const li = $(el)
      const parent = (el as Element).parent
      const parentTag = parent && parent.type === 'tag' ? (parent as Element).name : ''
      const orphan = parentTag !== 'ul' && parentTag !== 'ol'
      const hasBlock = li.children(BLOCK_SEL).length > 0
      const onlyImg = li.children().length === 1 && li.children('img').length === 1 && isBlank(li.text())
      const empty = li.children().length === 0 && isBlank(li.text())
      if (!orphan && !hasBlock && !onlyImg && !empty) return // 진짜 글머리 항목
      if (empty) li.remove()
      else li.replaceWith(hasBlock ? (li.html() ?? '') : `<p>${li.html() ?? ''}</p>`)
      changed += 1
    })
    $('ul, ol').each((_, el) => {
      const list = $(el)
      const items = list.children('li')
      if (items.length === 0) {
        list.replaceWith(list.html() ?? '')
        changed += 1
      } else if (items.length === 1 && items.children(BLOCK_SEL).length === 0) {
        list.replaceWith(`<p>${items.html() ?? ''}</p>`)
        changed += 1
      }
    })
    stats.layoutLists += changed
    if (!changed) break
  }

  // 1c) 원본의 고정 폭(≈700px)에 맞춰 줄마다 <p> 로 끊긴 문장 잇기 —
  //     문장이 끝나지 않은 문단 바로 뒤에 문단이 오면 한 문단으로 (글머리 줄·이미지·표·짧은 줄은 제외)
  // 문단 사이에 낀 빈 인라인 태그(<b></b> 등)는 잇기를 방해하므로 먼저 지운다
  $('b, strong, i, em, u, span, font').each((_, el) => {
    const node = $(el)
    if (node.children().length === 0 && isBlank(node.text())) node.remove()
  })
  $('p').each((_, el) => {
    const cur = $(el)
    if (!(el as Element).parent) return // 앞 문단에 이미 합쳐져 떨어져 나간 노드
    for (;;) {
      const text = cur.text().replace(/ /g, ' ').trim()
      // 한 줄이 가득 찬 문단(≈700px 폭에서 28자 이상)만 이어붙인다 — 짧은 소제목 줄은 그대로
      if (text.length < 28 || SENTENCE_END.test(text) || LIST_LIKE.test(text) || cur.find('img, table, br').length) break
      let next: AnyNode | null = (cur[0] as Element).next
      while (next && next.type === 'text' && !(next as { data: string }).data.trim()) next = next.next
      if (!next || next.type !== 'tag' || (next as Element).name !== 'p') break
      const np = $(next as Element)
      const ntext = np.text().replace(/ /g, ' ').trim()
      if (!ntext || LIST_LIKE.test(ntext) || np.find('img, table').length || (np.attr('style') ?? '') !== (cur.attr('style') ?? '')) break
      cur.append(' ' + (np.html() ?? '').trim())
      np.remove()
      stats.linesMerged += 1
    }
  })

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
  for (let pass = 0; pass < 40; pass += 1) {
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

  // 보이지 않는 문자(BOM·zero-width) 제거 후 sanitize
  const out = sanitizeHtml(($.root().html() ?? '').replace(/[​﻿]/g, ''))
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

  let { posts, pages } = await loadTargets()
  if (ONLY) {
    const hit = (r: Row) => r.id.includes(ONLY) || (r.slug ?? '').includes(ONLY) || r.title.includes(ONLY)
    posts = posts.filter(hit)
    pages = pages.filter(hit)
  }
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
    const width = ONLY ? 4000 : 400
    log(`  전: ${(src.content ?? '').replace(/\s+/g, ' ').slice(0, width)}`)
    log(`  후: ${p.html.replace(/\s+/g, ' ').slice(0, width)}`)
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
