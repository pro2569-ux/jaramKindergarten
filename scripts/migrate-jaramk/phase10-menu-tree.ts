/**
 * Phase 10. 메뉴 3단 복원 — 이관 때 "그룹명 · 항목명" 으로 2단 평탄화했던 교육프로그램 소분류를 원본처럼 3단으로 되돌린다.
 *   교육프로그램 > 자연주의 유아교육 프로그램 > 숲유치원 프로그램 …(5)
 *   교육프로그램 > 특색프로그램 > 독서코칭 프로그램 …(5)
 *
 *   node scripts/migrate-jaramk/phase10-menu-tree.ts                     dry-run(기본): 현재 트리와 바뀔 행 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase10-menu-tree.ts --apply             실제 반영. 반영 전에 menus 전체를 백업
 *   node scripts/migrate-jaramk/phase10-menu-tree.ts --rollback <백업.json>   만든 그룹 행을 지우고 바뀐 행을 백업 값으로 되돌리기
 *   node scripts/migrate-jaramk/phase10-menu-tree.ts --fixture <out.json>   반영 결과를 DB 대신 JSON 으로 (앱의 MENU_ROWS_FIXTURE 로 로컬 검증)
 *
 * 방식
 * - 라벨이 "<그룹명> · <항목명>" 인 depth 1 메뉴를 그룹별로 모은다 (그룹명 → GROUP_SLUGS 로 slug 결정)
 * - 그룹 메뉴 행(depth 1, page_id null, slug=그룹 slug)을 첫 항목 자리에 만들고, 항목들은 parent_id=그룹, depth 2, 라벨=항목명 으로 바꾼다
 * - 같은 대분류 아래 나머지 형제의 sort_order 는 그룹 뒤로 다시 매긴다 (원본 순서 유지)
 * - pages 는 건드리지 않는다. 라우팅은 /{대분류}/{그룹}/{항목} 이고 옛 2단 경로는 앱에서 영구 리다이렉트한다
 * - 재실행 안전: 그룹 slug 가 이미 있고 접두어 라벨이 없으면 "바뀌는 행 없음"
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const FIXTURE_IDX = process.argv.indexOf('--fixture')
const FIXTURE_FILE = FIXTURE_IDX >= 0 ? (process.argv[FIXTURE_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'menu-tree')

/** 그룹명 → 그룹 메뉴 slug (URL 조각) */
const GROUP_SLUGS: Record<string, string> = {
  '자연주의 유아교육 프로그램': 'nature',
  '특색프로그램': 'featured',
}
const SEP = ' · '

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface MenuRow {
  id: string
  parent_id: string | null
  label: string
  slug: string
  page_id: string | null
  sort_order: number
  is_visible: boolean
  depth: number
  /** 링크 페이지 판단용 (앱의 buildMenuTree 와 같은 모양) */
  pages?: { layout_config: Record<string, unknown> | null } | null
}

async function loadMenus(): Promise<MenuRow[]> {
  const { data, error } = await db.from('menus').select('id, parent_id, label, slug, page_id, sort_order, is_visible, depth, pages(layout_config)')
  if (error) throw new Error(`menus 조회 실패: ${error.message}`)
  return (data ?? []) as unknown as MenuRow[]
}

/** 계획을 DB 대신 메모리의 행에 적용한 결과 (로컬 검증용 fixture) */
function simulate(menus: MenuRow[], groups: GroupPlan[], resort: Array<{ row: MenuRow; sort_order: number }>): MenuRow[] {
  const rows = menus.map((m) => ({ ...m }))
  const byId = new Map(rows.map((r) => [r.id, r]))
  for (const g of groups) {
    let groupId = g.existing?.id ?? null
    if (groupId) Object.assign(byId.get(groupId)!, { label: g.name, sort_order: g.sort_order, depth: 1, is_visible: true, page_id: null, pages: null })
    else {
      groupId = `fixture-${g.slug}`
      rows.push({ id: groupId, parent_id: g.root.id, label: g.name, slug: g.slug, page_id: null, sort_order: g.sort_order, is_visible: true, depth: 1, pages: null })
    }
    for (const m of g.members) Object.assign(byId.get(m.row.id)!, { parent_id: groupId, label: m.label, sort_order: m.sort_order, depth: 2 })
  }
  for (const r of resort) byId.get(r.row.id)!.sort_order = r.sort_order
  return rows
}

function printTree(menus: MenuRow[], title: string): void {
  log(`== ${title}`)
  const byParent = (pid: string | null) => menus.filter((m) => m.parent_id === pid).sort((a, b) => a.sort_order - b.sort_order)
  const walk = (pid: string | null, indent: string) => {
    for (const m of byParent(pid)) {
      log(`${indent}${String(m.sort_order).padStart(2)} ${m.label}  (/${m.slug}, depth ${m.depth}${m.page_id ? '' : ', page 없음'}${m.is_visible ? '' : ', 숨김'})`)
      walk(m.id, indent + '    ')
    }
  }
  walk(null, '')
}

interface GroupPlan {
  root: MenuRow
  name: string
  slug: string
  sort_order: number
  existing: MenuRow | null
  members: Array<{ row: MenuRow; label: string; sort_order: number }>
}

function buildPlan(menus: MenuRow[]): { groups: GroupPlan[]; resort: Array<{ row: MenuRow; sort_order: number }>; problems: string[] } {
  const problems: string[] = []
  const groups: GroupPlan[] = []
  const resort: Array<{ row: MenuRow; sort_order: number }> = []
  const roots = menus.filter((m) => m.depth === 0)
  for (const root of roots) {
    // 보이는 소분류만 다룬다. 숨김 행(이관 때 slug 가 겹쳐 legacy- 로 남긴 중복 등)은 그대로 둔다
    const allChildren = menus.filter((m) => m.parent_id === root.id).sort((a, b) => a.sort_order - b.sort_order)
    const children = allChildren.filter((c) => c.is_visible)
    const prefixed = children.filter((c) => c.label.includes(SEP))
    if (prefixed.length === 0) continue
    // 그룹별로 모으기 (첫 등장 순서)
    const byGroup = new Map<string, MenuRow[]>()
    for (const c of prefixed) {
      const name = c.label.split(SEP)[0]!.trim()
      if (!byGroup.has(name)) byGroup.set(name, [])
      byGroup.get(name)!.push(c)
    }
    for (const [name, rows] of byGroup) {
      const slug = GROUP_SLUGS[name]
      if (!slug) {
        problems.push(`[${root.slug}] 그룹 '${name}' 의 slug 가 GROUP_SLUGS 에 없음`)
        continue
      }
      // 같은 slug 의 기존 행(숨김 포함)은 그룹 행으로 재사용한다. 페이지가 연결돼 있었으면 연결만 푼다 (pages 행은 유지, 백업으로 복원 가능)
      const existing = allChildren.find((c) => c.slug === slug) ?? null
      if (existing && existing.is_visible && existing.page_id) problems.push(`[${root.slug}] 그룹 slug '${slug}' 가 보이는 페이지 메뉴로 이미 쓰이고 있음`)
      groups.push({
        root, name, slug, sort_order: rows[0]!.sort_order, existing,
        members: rows.map((r, i) => ({ row: r, label: r.label.split(SEP).slice(1).join(SEP).trim(), sort_order: i + 1 })),
      })
    }
    // 대분류 아래 새 순서: 접두어 없는 형제 + 그룹(첫 항목 자리) 을 원래 순서대로 1..n
    const seq: Array<{ key: string; order: number; row?: MenuRow; group?: GroupPlan }> = []
    for (const c of children) {
      if (!c.label.includes(SEP)) seq.push({ key: c.id, order: c.sort_order, row: c })
    }
    for (const g of groups.filter((g) => g.root.id === root.id)) seq.push({ key: g.slug, order: g.sort_order, group: g })
    seq.sort((a, b) => a.order - b.order)
    seq.forEach((s, i) => {
      const order = i + 1
      if (s.group) s.group.sort_order = order
      else if (s.row && s.row.sort_order !== order) resort.push({ row: s.row, sort_order: order })
    })
  }
  return { groups, resort, problems }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) return rollback(ROLLBACK_FILE)

  const menus = await loadMenus()
  printTree(menus, '현재 메뉴 트리')
  const { groups, resort, problems } = buildPlan(menus)
  log()
  log(`== 계획: 그룹 ${groups.length}개, 항목 ${groups.reduce((n, g) => n + g.members.length, 0)}개 재배치, 형제 순서 조정 ${resort.length}건`)
  for (const g of groups) {
    log(`- [${g.root.slug}] ${g.sort_order}. ${g.name} (/${g.root.slug}/${g.slug}) ${g.existing ? `기존 행 재사용 (id ${g.existing.id}, "${g.existing.label}"${g.existing.is_visible ? '' : ', 숨김→표시'}${g.existing.page_id ? ', 페이지 연결 해제' : ''})` : '그룹 행 생성'}`)
    for (const m of g.members) log(`      ${m.sort_order}. ${m.label}  ← "${m.row.label}" (/${g.root.slug}/${g.slug}/${m.row.slug})`)
  }
  for (const r of resort) log(`- [순서] ${r.row.label}: ${r.row.sort_order} → ${r.sort_order}`)
  if (problems.length) {
    log()
    log(`== 문제 ${problems.length}건 (해결 전 --apply 불가)`)
    for (const p of problems) log(`- ${p}`)
  }
  const planPath = join(OUT, `plan-${stamp()}.json`)
  writeFileSync(planPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, groups: groups.map((g) => ({ root: g.root.slug, name: g.name, slug: g.slug, sort_order: g.sort_order, existing: g.existing?.id ?? null, members: g.members.map((m) => ({ id: m.row.id, from: m.row.label, to: m.label, slug: m.row.slug, sort_order: m.sort_order })) })), resort: resort.map((r) => ({ id: r.row.id, label: r.row.label, from: r.row.sort_order, to: r.sort_order })), problems }, null, 2))
  log()
  log(`계획 저장: ${planPath}`)
  if (FIXTURE_FILE) {
    const rows = simulate(menus, groups, resort)
    writeFileSync(FIXTURE_FILE, JSON.stringify(rows, null, 2))
    printTree(rows, '시뮬레이션 트리 (fixture)')
    log(`fixture 저장: ${FIXTURE_FILE} — MENU_ROWS_FIXTURE=<이 경로> 로 앱을 띄우면 이 구조로 보입니다`)
    return
  }
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  if (problems.length) {
    log('문제가 있어 반영하지 않습니다.')
    process.exit(2)
  }
  if (groups.length === 0 && resort.length === 0) {
    log('바뀌는 행이 없습니다.')
    return
  }

  const backupPath = join(OUT, `backup-${stamp()}.json`)
  const created: string[] = []
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), menus, created }, null, 2))
  log(`백업 저장 (menus 전체 ${menus.length}행): ${backupPath}`)

  for (const g of groups) {
    let groupId = g.existing?.id ?? null
    if (groupId) {
      const { error } = await db.from('menus').update({ label: g.name, sort_order: g.sort_order, depth: 1, is_visible: true, page_id: null }).eq('id', groupId)
      if (error) throw new Error(`그룹 ${g.name} 갱신 실패: ${error.message}`)
      log(`menus 그룹 재사용: ${g.name} (${groupId})`)
    } else {
      const { data, error } = await db
        .from('menus')
        .insert({ parent_id: g.root.id, label: g.name, slug: g.slug, page_id: null, sort_order: g.sort_order, is_visible: true, depth: 1 })
        .select('id')
        .single()
      if (error || !data) throw new Error(`그룹 ${g.name} 생성 실패: ${error?.message}`)
      groupId = (data as { id: string }).id
      created.push(groupId)
      writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), menus, created }, null, 2))
      log(`menus 그룹 생성: ${g.name} (${groupId})`)
    }
    for (const m of g.members) {
      const { error } = await db.from('menus').update({ parent_id: groupId, label: m.label, sort_order: m.sort_order, depth: 2 }).eq('id', m.row.id)
      if (error) throw new Error(`항목 ${m.label} 이동 실패: ${error.message}`)
      log(`  menus 이동: "${m.row.label}" → ${g.name} > ${m.label}`)
    }
  }
  for (const r of resort) {
    const { error } = await db.from('menus').update({ sort_order: r.sort_order }).eq('id', r.row.id)
    if (error) throw new Error(`순서 조정 ${r.row.label} 실패: ${error.message}`)
    log(`menus 순서: ${r.row.label} ${r.row.sort_order} → ${r.sort_order}`)
  }
  printTree(await loadMenus(), '반영 후 메뉴 트리')
  log(`완료. 되돌리기: --rollback ${backupPath}`)
}

async function rollback(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`백업 파일 없음: ${file}`)
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { menus: MenuRow[]; created: string[] }
  let n = 0
  for (const m of backup.menus) {
    const { error } = await db.from('menus').update({ parent_id: m.parent_id, label: m.label, slug: m.slug, page_id: m.page_id, sort_order: m.sort_order, is_visible: m.is_visible, depth: m.depth }).eq('id', m.id)
    if (error) throw new Error(`menus ${m.label} 복원 실패: ${error.message}`)
    n++
  }
  if (backup.created.length) {
    const { error } = await db.from('menus').delete().in('id', backup.created)
    if (error) throw new Error(`생성한 그룹 행 삭제 실패: ${error.message}`)
  }
  log(`복원 완료: ${n}행 복원, 그룹 행 ${backup.created.length}개 삭제`)
  printTree(await loadMenus(), '복원 후 메뉴 트리')
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
