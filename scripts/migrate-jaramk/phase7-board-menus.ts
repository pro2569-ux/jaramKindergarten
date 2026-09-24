/**
 * Phase 7. 게시판 메뉴 구조를 원본(jaramk.com)과 같게 — 반별 앨범 게시판·교육자료실·입소신청서 + 우리 사이트 전용 게시판 링크.
 *   node scripts/migrate-jaramk/phase7-board-menus.ts                     dry-run(기본): 만들 pages/menus 행 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase7-board-menus.ts --apply             실제 반영. 반영 전에 menus 전체 + 관련 pages 를 백업
 *   node scripts/migrate-jaramk/phase7-board-menus.ts --rollback <백업.json>   이 스크립트가 만든 행을 지우고 백업 시점 값으로 되돌리기
 *
 * 방식 (menus.url 컬럼을 추가하는 DDL 없이)
 * - 반별 게시판: pages(page_type=gallery, layout_config.category=반 이름) + menus 자식 → /board/<slug> 에서 GalleryRenderer 가 반 필터
 * - 교육자료실: pages(page_type=list, layout_config{boardType:newsletter, legacyOnly:true, detailBase:/community/archive})
 * - 다른 라우트로 보내는 항목(공지사항·식단표·문의·입소신청서): pages(page_type=single, layout_config.redirectTo) "링크 페이지"
 *   → 헤더/사이드바는 목적지로 바로 링크, catch-all 로 들어오면 리디렉트
 * - 앨범·게시글의 is_published 는 건드리지 않는다. 새로 만드는 pages 행(내비게이션용)만 is_published=true
 * - 재실행 안전: 같은 (parent, slug) 메뉴·같은 pages.slug 가 있으면 건너뜀
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'board-menus')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

/** 입소신청서 이관 글 (posts.legacy_meta.boardID = www49) 의 상세 경로를 실행 시 찾는다 */
const APPLICATION_FORM_BOARD = 'www49'

interface Spec {
  parent: 'board' | 'community' | 'admission'
  slug: string
  label: string
  sort_order: number
  page: {
    title: string
    page_type: 'gallery' | 'list' | 'single'
    layout_config: Record<string, unknown>
    hero_subtitle?: string
  }
}

// 원본 메뉴 트리 순서(inventory) 그대로. 교육활동이야기: 자람반 산새반 라온반 맑은반 햇살반 샘물반 숲속반 자람이야기
const CLASS_BOARDS: Array<[slug: string, label: string]> = [
  ['jaram', '자람반'],
  ['sansae', '산새반'],
  ['raon', '라온반'],
  ['malgeun', '맑은반'],
  ['haetsal', '햇살반'],
  ['saemmul', '샘물반'],
  ['supsok', '숲속반'],
  ['story', '자람이야기'],
]

function buildSpecs(applicationFormPath: string | null): Spec[] {
  const specs: Spec[] = CLASS_BOARDS.map(([slug, label], i) => ({
    parent: 'board',
    slug,
    label,
    sort_order: i + 1,
    page: {
      title: label,
      page_type: 'gallery',
      layout_config: { category: label, columns: 3, aspectRatio: 'auto', gap: 'md' },
      hero_subtitle: label === '자람이야기' ? '자람동산의 행사와 특별한 순간들' : `${label} 아이들의 활동 이야기`,
    },
  }))
  // 커뮤니티: 원본 항목(교육자료실) 먼저, 그 뒤 우리 사이트 전용 게시판
  specs.push(
    {
      parent: 'community',
      slug: 'archive',
      label: '교육자료실',
      sort_order: 1,
      page: {
        title: '교육자료실',
        page_type: 'list',
        layout_config: { boardType: 'newsletter', legacyOnly: true, detailBase: '/community/archive', pageSize: 15 },
        hero_subtitle: '자람동산이 전하는 육아·교육 자료',
      },
    },
    { parent: 'community', slug: 'notice', label: '공지사항', sort_order: 2, page: { title: '공지사항', page_type: 'single', layout_config: { redirectTo: '/board/notice' } } },
    { parent: 'community', slug: 'newsletter', label: '가정통신문', sort_order: 3, page: { title: '가정통신문', page_type: 'single', layout_config: { redirectTo: '/board/newsletter' } } },
    { parent: 'community', slug: 'meal-plan', label: '식단표', sort_order: 4, page: { title: '식단표', page_type: 'single', layout_config: { redirectTo: '/board/meal-plan' } } },
    { parent: 'community', slug: 'inquiry', label: '문의하기', sort_order: 5, page: { title: '문의하기', page_type: 'single', layout_config: { redirectTo: '/community/inquiry' } } }
  )
  if (applicationFormPath) {
    specs.push({
      parent: 'admission',
      slug: 'application-form',
      label: '입소신청서',
      sort_order: 2,
      page: { title: '입소신청서', page_type: 'single', layout_config: { redirectTo: applicationFormPath } },
    })
  }
  return specs
}

interface MenuRow { id: string; parent_id: string | null; label: string; slug: string; page_id: string | null; sort_order: number; is_visible: boolean; depth: number }
interface PageRow { id: string; slug: string; title: string; page_type: string; layout_config: Record<string, unknown> | null; is_published: boolean; category: string }

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) return rollback(ROLLBACK_FILE)

  const { data: menusData, error: mErr } = await db.from('menus').select('id, parent_id, label, slug, page_id, sort_order, is_visible, depth')
  if (mErr) throw new Error(`menus 조회 실패: ${mErr.message}`)
  const menus = (menusData ?? []) as MenuRow[]
  const roots = new Map(menus.filter((m) => m.depth === 0).map((m) => [m.slug, m]))

  const { data: formPost } = await db.from('posts').select('id, title, is_published').eq('legacy_meta->>boardID', APPLICATION_FORM_BOARD).maybeSingle()
  const applicationFormPath = formPost ? `/board/notice/${formPost.id}` : null
  if (!formPost) log('⚠ 입소신청서 글(www49)을 찾지 못해 해당 메뉴는 건너뜁니다')
  else log(`입소신청서 글: ${formPost.id} «${formPost.title}» ${formPost.is_published ? '공개' : '비공개 (공개 전까지 메뉴 링크는 404)'}`)

  const specs = buildSpecs(applicationFormPath)
  const { data: pagesData, error: pErr } = await db.from('pages').select('id, slug, title, page_type, layout_config, is_published, category').in('slug', specs.map((s) => s.slug))
  if (pErr) throw new Error(`pages 조회 실패: ${pErr.message}`)
  const existingPages = new Map(((pagesData ?? []) as PageRow[]).map((p) => [p.slug, p]))

  const plan: Array<{ spec: Spec; parentId: string; pageExists: boolean; menuExists: boolean }> = []
  const problems: string[] = []
  for (const s of specs) {
    const root = roots.get(s.parent)
    if (!root) {
      problems.push(`대분류 '${s.parent}' 가 menus 에 없음`)
      continue
    }
    const menuExists = menus.some((m) => m.parent_id === root.id && m.slug === s.slug)
    const pageExists = existingPages.has(s.slug)
    plan.push({ spec: s, parentId: root.id, pageExists, menuExists })
  }

  log(`== 계획 ${plan.length}항목`)
  for (const p of plan) {
    const lc = JSON.stringify(p.spec.page.layout_config)
    log(`- [${p.spec.parent}] ${String(p.spec.sort_order).padStart(2)} ${p.spec.label.padEnd(8)} /${p.spec.parent}/${p.spec.slug}  page:${p.pageExists ? '있음' : '생성'}(${p.spec.page.page_type} ${lc})  menu:${p.menuExists ? '있음' : '생성'}`)
  }
  if (problems.length) {
    log(`== 문제 ${problems.length}건`)
    for (const x of problems) log(`- ${x}`)
  }
  const planPath = join(OUT, `plan-${stamp()}.json`)
  writeFileSync(planPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, plan, problems }, null, 2))
  log(`계획 저장: ${planPath}`)
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  if (problems.length) {
    log('문제가 있어 반영하지 않습니다.')
    process.exit(2)
  }

  // 백업: menus 전체 + 관련 pages (content 제외)
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  const backup = { createdAt: new Date().toISOString(), menus, pages: [...existingPages.values()], createdPageIds: [] as string[], createdMenuIds: [] as string[] }
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  log(`백업 저장: ${backupPath}`)

  for (const p of plan) {
    let pageId = existingPages.get(p.spec.slug)?.id ?? null
    if (!pageId) {
      const { data, error } = await db
        .from('pages')
        .insert({
          slug: p.spec.slug,
          title: p.spec.page.title,
          category: p.spec.parent,
          page_type: p.spec.page.page_type,
          layout_config: p.spec.page.layout_config,
          hero_subtitle: p.spec.page.hero_subtitle ?? null,
          content: null,
          is_published: true,
          sort_order: p.spec.sort_order,
        })
        .select('id')
        .single()
      if (error || !data) throw new Error(`pages ${p.spec.slug} 생성 실패: ${error?.message}`)
      pageId = data.id as string
      backup.createdPageIds.push(pageId)
      writeFileSync(backupPath, JSON.stringify(backup, null, 2))
      log(`pages ${p.spec.slug} 생성 (${pageId})`)
    }
    if (!p.menuExists) {
      const { data, error } = await db
        .from('menus')
        .insert({ parent_id: p.parentId, label: p.spec.label, slug: p.spec.slug, page_id: pageId, sort_order: p.spec.sort_order, is_visible: true, depth: 1 })
        .select('id')
        .single()
      if (error || !data) throw new Error(`menus ${p.spec.parent}/${p.spec.slug} 생성 실패: ${error?.message}`)
      backup.createdMenuIds.push(data.id as string)
      writeFileSync(backupPath, JSON.stringify(backup, null, 2))
      log(`menus /${p.spec.parent}/${p.spec.slug} 생성`)
    }
  }
  log(`완료. /api/menus 와 페이지 캐시(60초)가 지나면 헤더에 반영됩니다. 되돌리기: --rollback ${backupPath}`)
}

async function rollback(file: string): Promise<void> {
  if (!existsSync(file)) throw new Error(`백업 파일 없음: ${file}`)
  const backup = JSON.parse(readFileSync(file, 'utf8')) as { menus: MenuRow[]; pages: PageRow[]; createdPageIds: string[]; createdMenuIds: string[] }
  if (backup.createdMenuIds.length) {
    const { error } = await db.from('menus').delete().in('id', backup.createdMenuIds)
    if (error) throw new Error(`menus 삭제 실패: ${error.message}`)
    log(`menus ${backup.createdMenuIds.length}행 삭제`)
  }
  if (backup.createdPageIds.length) {
    const { error } = await db.from('pages').delete().in('id', backup.createdPageIds)
    if (error) throw new Error(`pages 삭제 실패: ${error.message}`)
    log(`pages ${backup.createdPageIds.length}행 삭제`)
  }
  log('복원 완료')
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
