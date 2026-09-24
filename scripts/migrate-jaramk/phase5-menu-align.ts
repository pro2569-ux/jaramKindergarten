/**
 * Phase 5. 메뉴 정렬 — 공개 메뉴를 원본(jaramk.com) 구조와 같게 맞춘다.
 *   node scripts/migrate-jaramk/phase5-menu-align.ts                     dry-run(기본): 바뀌는 행의 전후 값만 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase5-menu-align.ts --apply             실제 반영(승인 후). 반영 전에 menus/pages 를 백업
 *   node scripts/migrate-jaramk/phase5-menu-align.ts --rollback <백업.json>   백업 시점의 값으로 되돌리기
 *
 * 원칙(승인)
 * - 시드 메뉴 행은 유지하고 page_id 만 이관 페이지로 교체한다 (URL·정렬·정적 라우트·푸터 링크가 그대로 유지됨)
 * - 원본에 없는 시드 항목(자연주의 유아교육 단일 페이지)은 숨긴다
 * - 원본 3단 메뉴는 "그룹명 · 항목명" 2단 평탄화를 유지하고, 순서는 원본 순서를 따른다
 * - 노출 메뉴가 가리키는 이관 페이지는 is_published=true, 이관 페이지로 대체된 시드 페이지는 false
 * - 인사말(greeting)은 결정 전까지 변경 대상에서 제외한다 (비교 정보만 출력)
 * - 게시판 메뉴(반별 앨범·교육자료실)와 남는 이관 메뉴 행(legacy-* 등)은 이 스크립트가 건드리지 않는다
 *
 * 반영 순서: 페이지 공개 → 메뉴 변경 → 시드 페이지 비공개 (중간 상태에서도 노출 메뉴가 404 를 내지 않게)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { OUT_DIR } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const ALIGN_DIR = join(OUT_DIR, 'menu-align')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const textOf = (html: string | null) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
/** 본문 크기: 글자 수 + 이미지 수 (이관 페이지 중 이미지만으로 된 페이지가 있어 글자 수만으로 판단하지 않는다) */
const contentStats = (html: string | null) => ({ chars: textOf(html).length, imgs: ((html ?? '').match(/<img\b/gi) ?? []).length })
const statsLabel = (html: string | null) => {
  const s = contentStats(html)
  return `${s.chars}자${s.imgs > 0 ? `+이미지 ${s.imgs}장` : ''}`
}

interface MenuRow {
  id: string
  parent_id: string | null
  label: string
  slug: string
  page_id: string | null
  sort_order: number
  is_visible: boolean
  depth: number
  legacy_source_url: string | null
}
interface PageRow {
  id: string
  slug: string
  title: string
  is_published: boolean
  updated_at: string | null
  content: string | null
  legacy_source_url: string | null
}

/** 메뉴 한 행에 적용할 목표값. page 는 pages.slug 로 적고 실행 시 page_id 로 바꾼다. */
interface MenuSpec {
  parent: string
  slug: string
  label?: string
  newSlug?: string
  page?: string
  sort?: number
  visible?: boolean
  note: string
}

// 원본 순서 — 어린이집소개: 인사말(제외) 1, 교육이념/원훈 2, 교원/반편성 3, 교육환경 4, 시설현황 5, 오시는길 6
//            교육프로그램: 표준보육과정 1, 누리과정 2, 자연주의 유아교육 프로그램 · 5개 3~7, 특색프로그램 · 5개 8~12, 특별활동 13, 행사/체험활동 14
//            입학안내: 신입원아적응지도 안내 1 (입소신청서는 게시글이라 메뉴 모델로 표현 불가 → 보류)
const MENU_SPECS: MenuSpec[] = [
  { parent: 'about', slug: 'philosophy', page: 'legacy-philosophy', sort: 2, note: '시드 행 유지, 이관 페이지 연결' },
  { parent: 'about', slug: 'class', page: 'teachers', sort: 3, note: '시드 행 유지, 이관 페이지(teachers) 연결. 정적 /about/teachers 는 그대로' },
  { parent: 'about', slug: 'environment', page: 'legacy-environment', sort: 4, note: '순서 4 로, 이관 페이지 연결' },
  { parent: 'about', slug: 'facilities', page: 'legacy-facilities', sort: 5, note: '순서 5 로, 이관 페이지 연결' },
  { parent: 'about', slug: 'legacy-location', newSlug: 'location', sort: 6, visible: true, note: '노출. /about/location 정적(지도) 라우트로 열리므로 이관 페이지는 비공개 유지' },

  { parent: 'curriculum', slug: 'standard', page: 'legacy-standard', sort: 1, note: '시드 행 유지, 이관 페이지 연결' },
  { parent: 'curriculum', slug: 'nuri', page: 'legacy-nuri', sort: 2, note: '시드 행 유지, 이관 페이지 연결' },
  { parent: 'curriculum', slug: 'forest', label: '자연주의 유아교육 프로그램 · 숲유치원 프로그램', page: 'legacy-forest', sort: 3, note: '시드 행 유지, 라벨을 평탄화 형식으로, 이관 페이지 연결' },
  { parent: 'curriculum', slug: 'nature', visible: false, note: '원본에 없는 시드 항목(자연주의 유아교육 단일 페이지) → 숨김' },
  { parent: 'curriculum', slug: 'farm', sort: 4, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'fitness', sort: 5, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'seasonal-customs', sort: 6, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'outdoor-walk', sort: 7, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'reading-coaching', sort: 8, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'happy-project', sort: 9, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'nasa-creca', sort: 10, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'creative-tools', sort: 11, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'parents-storytelling', sort: 12, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'special-activities', sort: 13, visible: true, note: '이관 행 노출' },
  { parent: 'curriculum', slug: 'events', sort: 14, visible: true, note: '이관 행 노출' },

  { parent: 'admission', slug: 'adaptation-guide', sort: 1, visible: true, note: '이관 행 노출' },
]

/**
 * 페이지 공개/비공개는 목록을 따로 두지 않고 메뉴 변경에서 끌어낸다.
 * - 공개: 노출 메뉴가 가리키게 되는 페이지 (재연결 대상 page, 또는 새로 노출되는 행의 기존 page_id)
 * - 비공개: 재연결로 밀려난 시드 페이지와 숨긴 행의 페이지 중, 반영 후 어떤 노출 메뉴도 가리키지 않는 것
 *   (코드에서 pages.slug 로 직접 조회하는 곳은 없음 — 정적 about/location, about/teachers 는 pages 를 안 읽음)
 */
/** 어떤 경우에도 비공개로 바꾸지 않는 페이지 */
const KEEP_PUBLISHED = new Set(['greeting', 'location'])
/** 결정용 비교만 출력하고 변경하지 않는 쌍 */
const GREETING_PAIR = ['greeting', 'legacy-greeting']
/** 정적 라우트가 있어 page_id/공개 여부와 무관하게 열리는 경로 */
const STATIC_ROUTES = new Set(['about/teachers', 'about/location', 'community/inquiry'])

type MenuPatch = Partial<Pick<MenuRow, 'label' | 'slug' | 'page_id' | 'sort_order' | 'is_visible'>>
interface MenuChange { id: string; path: string; before: MenuRow; patch: MenuPatch; note: string }
interface PageChange { id: string; slug: string; title: string; before: boolean; after: boolean; note: string }
interface Plan { menuChanges: MenuChange[]; pageChanges: PageChange[]; problems: string[]; after: MenuRow[] }

const db = adminClient()

async function loadAll(): Promise<{ menus: MenuRow[]; pages: PageRow[] }> {
  const { data: menus, error: e1 } = await db
    .from('menus')
    .select('id, parent_id, label, slug, page_id, sort_order, is_visible, depth, legacy_source_url')
    .order('depth')
    .order('sort_order')
  if (e1) throw new Error(`menus 조회 실패: ${e1.message}`)
  const { data: pages, error: e2 } = await db
    .from('pages')
    .select('id, slug, title, is_published, updated_at, content, legacy_source_url')
    .order('slug')
  if (e2) throw new Error(`pages 조회 실패: ${e2.message}`)
  return { menus: (menus ?? []) as MenuRow[], pages: (pages ?? []) as PageRow[] }
}

function buildPlan(menus: MenuRow[], pages: PageRow[]): Plan {
  const problems: string[] = []
  const roots = new Map<string, MenuRow>(menus.filter((m) => m.depth === 0).map((m) => [m.slug, m]))
  const pageBySlug = new Map<string, PageRow>(pages.map((p) => [p.slug, p]))
  const childOf = (parent: string, slug: string): MenuRow | undefined => {
    const root = roots.get(parent)
    return root ? menus.find((m) => m.parent_id === root.id && m.slug === slug) : undefined
  }

  const pageById = new Map<string, PageRow>(pages.map((p) => [p.id, p]))
  const menuChanges: MenuChange[] = []
  const publishIds = new Set<string>() // 노출 메뉴가 가리키게 되는 페이지
  const replacedIds = new Set<string>() // 재연결로 밀려나거나 숨긴 행이 가리키던 페이지
  for (const s of MENU_SPECS) {
    const row = childOf(s.parent, s.slug)
    if (!row) {
      problems.push(`메뉴 행 없음: ${s.parent}/${s.slug}`)
      continue
    }
    const path = `${s.parent}/${s.newSlug ?? s.slug}`
    const patch: MenuPatch = {}
    if (s.label !== undefined && s.label !== row.label) patch.label = s.label
    if (s.newSlug && s.newSlug !== row.slug) {
      if (childOf(s.parent, s.newSlug)) problems.push(`slug 충돌: ${s.parent}/${s.newSlug} 가 이미 있음`)
      else patch.slug = s.newSlug
    }
    if (s.page) {
      const p = pageBySlug.get(s.page)
      if (!p) problems.push(`연결할 페이지 없음: ${s.page} (메뉴 ${s.parent}/${s.slug})`)
      else {
        const st = contentStats(p.content)
        if (st.chars < 20 && st.imgs === 0) problems.push(`연결할 페이지 본문이 비어 있음: ${s.page} (${st.chars}자, 이미지 ${st.imgs}장)`)
        if (p.id !== row.page_id) {
          patch.page_id = p.id
          if (row.page_id) replacedIds.add(row.page_id)
        }
        publishIds.add(p.id)
      }
    } else if (s.visible === true && row.page_id && !STATIC_ROUTES.has(path)) {
      publishIds.add(row.page_id)
    }
    if (s.visible === false && row.page_id) replacedIds.add(row.page_id)
    if (s.sort !== undefined && s.sort !== row.sort_order) patch.sort_order = s.sort
    if (s.visible !== undefined && s.visible !== row.is_visible) patch.is_visible = s.visible
    if (Object.keys(patch).length > 0) menuChanges.push({ id: row.id, path: `${s.parent}/${s.slug}`, before: row, patch, note: s.note })
  }

  // 반영 후 메뉴 상태
  const after: MenuRow[] = menus.map((m) => {
    const c = menuChanges.find((x) => x.id === m.id)
    return c ? { ...m, ...c.patch } : m
  })
  const stillUsed = new Set<string>(after.filter((m) => m.is_visible && m.page_id).map((m) => m.page_id as string))

  const pageChanges: PageChange[] = []
  for (const id of publishIds) {
    const p = pageById.get(id)
    if (!p) {
      problems.push(`공개 대상 페이지 없음: ${id}`)
      continue
    }
    if (!p.is_published) pageChanges.push({ id, slug: p.slug, title: p.title, before: false, after: true, note: `노출 메뉴가 가리키는 이관 페이지 (${statsLabel(p.content)})` })
  }
  for (const id of replacedIds) {
    const p = pageById.get(id)
    if (!p) {
      problems.push(`대체된 페이지를 찾을 수 없음: ${id}`)
      continue
    }
    if (KEEP_PUBLISHED.has(p.slug) || stillUsed.has(id) || !p.is_published) continue
    pageChanges.push({ id, slug: p.slug, title: p.title, before: true, after: false, note: `이관 페이지로 대체된 시드 페이지 (${statsLabel(p.content)})` })
  }

  // 반영 후 상태 검증: 노출 메뉴 → 공개 페이지, 형제 순서 중복 없음
  const publishedAfter = new Map<string, boolean>(pages.map((p) => [p.id, pageChanges.find((c) => c.id === p.id)?.after ?? p.is_published]))
  for (const m of after.filter((x) => x.depth === 1 && x.is_visible)) {
    const root = menus.find((r) => r.id === m.parent_id)
    const path = `${root?.slug ?? '?'}/${m.slug}`
    if (STATIC_ROUTES.has(path)) continue
    if (!m.page_id || !publishedAfter.get(m.page_id)) problems.push(`노출 메뉴가 비공개/없는 페이지를 가리킴: ${path}`)
  }
  for (const root of roots.values()) {
    const seen = new Map<number, string>()
    for (const m of after.filter((x) => x.parent_id === root.id && x.is_visible).sort((a, b) => a.sort_order - b.sort_order)) {
      const dup = seen.get(m.sort_order)
      if (dup) problems.push(`노출 메뉴 순서 중복: ${root.slug} sort_order=${m.sort_order} (${dup}, ${m.slug})`)
      seen.set(m.sort_order, m.slug)
    }
  }
  return { menuChanges, pageChanges, problems, after }
}

function printPlan(plan: Plan, menus: MenuRow[], pages: PageRow[]): void {
  const pageById = new Map<string, PageRow>(pages.map((p) => [p.id, p]))
  const publishedAfter = new Map<string, boolean>(plan.pageChanges.map((c) => [c.id, c.after]))
  /** 페이지 요약. afterState=true 면 반영 후 공개 여부로 표시 */
  const pageLabel = (id: string | null, afterState = false): string => {
    if (!id) return '(없음)'
    const p = pageById.get(id)
    if (!p) return `${id.slice(0, 8)}…(?)`
    const published = afterState ? (publishedAfter.get(id) ?? p.is_published) : p.is_published
    return `${p.slug}(${published ? '공개' : '비공개'}, ${statsLabel(p.content)})`
  }
  const fmt = (key: keyof MenuPatch, v: unknown): string => (key === 'page_id' ? pageLabel(v as string | null) : JSON.stringify(v))

  log('== 인사말 비교 (이번 변경 대상 아님 — 결정용)')
  for (const slug of GREETING_PAIR) {
    const p = pages.find((x) => x.slug === slug)
    if (!p) {
      log(`- ${slug}: 없음`)
      continue
    }
    const text = textOf(p.content)
    log(`- ${slug}: 제목 "${p.title}" / ${p.is_published ? '공개' : '비공개'} / updated_at ${p.updated_at ?? '-'} / 본문 ${text.length}자`)
    log(`    ${text.slice(0, 600)}${text.length > 600 ? ' …' : ''}`)
  }
  log()
  log(`== menus 변경 ${plan.menuChanges.length}행`)
  for (const c of plan.menuChanges) {
    const fields = (Object.keys(c.patch) as Array<keyof MenuPatch>).map((k) => `${k}: ${fmt(k, c.before[k])} → ${fmt(k, c.patch[k])}`)
    log(`- ${c.path} [${c.before.label}]  ${fields.join(' | ')}    # ${c.note}`)
  }
  log()
  log(`== pages 변경 ${plan.pageChanges.length}행`)
  for (const c of plan.pageChanges) log(`- ${c.slug} [${c.title}]  is_published: ${c.before} → ${c.after}    # ${c.note}`)
  log()
  log('== 반영 후 노출 메뉴 미리보기 (페이지 공개 여부는 반영 후 기준)')
  for (const root of plan.after.filter((m) => m.depth === 0).sort((a, b) => a.sort_order - b.sort_order)) {
    const kids = plan.after.filter((m) => m.parent_id === root.id && m.is_visible).sort((a, b) => a.sort_order - b.sort_order)
    log(`${root.label} (/${root.slug})${root.is_visible ? '' : ' [숨김]'}`)
    for (const k of kids) {
      const path = `${root.slug}/${k.slug}`
      log(`  ${String(k.sort_order).padStart(2)}. ${k.label}  /${path}  → ${STATIC_ROUTES.has(path) ? '정적 라우트' : pageLabel(k.page_id, true)}`)
    }
    if (kids.length === 0) log('  (하위 없음)')
  }
  const untouchedHidden = menus.filter((m) => m.depth === 1 && !m.is_visible && !plan.menuChanges.some((c) => c.id === m.id))
  log()
  log(`== 건드리지 않는 숨김 행 ${untouchedHidden.length}개: ${untouchedHidden.map((m) => m.slug).join(', ')}`)
  if (plan.problems.length > 0) {
    log()
    log(`== 문제 ${plan.problems.length}건 (해결 전 --apply 불가)`)
    for (const p of plan.problems) log(`- ${p}`)
  }
}

async function apply(plan: Plan, menus: MenuRow[], pages: PageRow[]): Promise<void> {
  if (plan.problems.length > 0) {
    log('문제가 있어 반영하지 않습니다.')
    process.exit(2)
  }
  if (plan.menuChanges.length === 0 && plan.pageChanges.length === 0) {
    log('바뀌는 행이 없습니다.')
    return
  }
  mkdirSync(ALIGN_DIR, { recursive: true })
  const backupPath = join(ALIGN_DIR, `backup-${stamp()}.json`)
  const stripContent = (p: PageRow): Omit<PageRow, 'content'> => ({
    id: p.id, slug: p.slug, title: p.title, is_published: p.is_published, updated_at: p.updated_at, legacy_source_url: p.legacy_source_url,
  })
  const backup = { createdAt: new Date().toISOString(), menus, pages: pages.map(stripContent) }
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  log(`백업 저장: ${backupPath}`)

  for (const c of plan.pageChanges.filter((x) => x.after)) {
    const { error } = await db.from('pages').update({ is_published: true }).eq('id', c.id)
    if (error) throw new Error(`pages ${c.slug} 공개 실패: ${error.message}`)
    log(`pages ${c.slug}: 공개`)
  }
  for (const c of plan.menuChanges) {
    const { error } = await db.from('menus').update(c.patch).eq('id', c.id)
    if (error) throw new Error(`menus ${c.path} 변경 실패: ${error.message}`)
    log(`menus ${c.path}: ${Object.keys(c.patch).join(', ')}`)
  }
  for (const c of plan.pageChanges.filter((x) => !x.after)) {
    const { error } = await db.from('pages').update({ is_published: false }).eq('id', c.id)
    if (error) throw new Error(`pages ${c.slug} 비공개 실패: ${error.message}`)
    log(`pages ${c.slug}: 비공개`)
  }
  log(`완료. /api/menus 와 페이지 캐시(60초)가 지나면 헤더에 반영됩니다. 되돌리기: --rollback ${backupPath}`)
}

async function rollback(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`백업 파일 없음: ${file}`)
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { menus: MenuRow[]; pages: Array<Omit<PageRow, 'content'>> }
  const { menus, pages } = await loadAll()
  const curMenu = new Map<string, MenuRow>(menus.map((m) => [m.id, m]))
  const curPage = new Map<string, PageRow>(pages.map((p) => [p.id, p]))
  let n = 0
  for (const b of backup.menus) {
    const cur = curMenu.get(b.id)
    if (!cur) {
      log(`menus ${b.slug}: 현재 없음 → 건너뜀`)
      continue
    }
    const patch: Record<string, unknown> = {}
    for (const k of ['label', 'slug', 'page_id', 'sort_order', 'is_visible'] as const) {
      if (cur[k] !== b[k]) patch[k] = b[k]
    }
    if (Object.keys(patch).length === 0) continue
    const { error } = await db.from('menus').update(patch).eq('id', b.id)
    if (error) throw new Error(`menus ${b.slug} 복원 실패: ${error.message}`)
    log(`menus ${b.slug}: ${Object.keys(patch).join(', ')} 복원`)
    n++
  }
  for (const b of backup.pages) {
    const cur = curPage.get(b.id)
    if (!cur || cur.is_published === b.is_published) continue
    const { error } = await db.from('pages').update({ is_published: b.is_published }).eq('id', b.id)
    if (error) throw new Error(`pages ${b.slug} 복원 실패: ${error.message}`)
    log(`pages ${b.slug}: is_published=${b.is_published} 복원`)
    n++
  }
  log(`복원 완료: ${n}행`)
}

async function main(): Promise<void> {
  if (ROLLBACK_FILE) {
    await rollback(ROLLBACK_FILE)
    return
  }
  const { menus, pages } = await loadAll()
  log(`현재 menus ${menus.length}행, pages ${pages.length}행`)
  const plan = buildPlan(menus, pages)
  printPlan(plan, menus, pages)
  mkdirSync(ALIGN_DIR, { recursive: true })
  const planPath = join(ALIGN_DIR, `plan-${stamp()}.json`)
  writeFileSync(
    planPath,
    JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, menuChanges: plan.menuChanges, pageChanges: plan.pageChanges, problems: plan.problems }, null, 2),
  )
  log()
  log(`계획 저장: ${planPath}`)
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  await apply(plan, menus, pages)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
