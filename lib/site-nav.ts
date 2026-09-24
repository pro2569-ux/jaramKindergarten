import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { menuData, type StaticMenuItem } from '@/lib/menu-items'
import { redirectTargetOf, type MenuLinkPage } from '@/lib/menu-links'

export interface NavLeaf {
  label: string
  href: string
}
/** 소분류(depth 1). children 이 있으면 원본(jaramk.com)의 3단 메뉴 그룹 — href 는 첫 하위 항목 */
export interface NavItem extends NavLeaf {
  children?: NavLeaf[]
}
export interface SectionNav {
  label: string
  items: NavItem[]
}

/** menus 행 트리 (depth 0 대분류 → 1 소분류/그룹 → 2 항목). 보이는(is_visible) 행만 */
export interface MenuNode {
  id: string
  label: string
  slug: string
  depth: number
  pageId: string | null
  /** 링크 페이지(pages.layout_config.redirectTo)의 목적지 */
  redirectTo: string | null
  /** 트리 경로 /{대분류}/{소분류}[/{항목}] */
  path: string
  children: MenuNode[]
}

// 소분류(메뉴 자식)는 없지만 전용 라우트가 따로 있는 대분류의 랜딩 경로.
// (catch-all 에는 자식이 없어 bare /board, /community 접근 시 404가 나므로 실제 페이지로 보냄)
const DEDICATED_LANDING: Record<string, string> = {
  board: '/board/notice',
  community: '/community/inquiry',
}

/** 노드의 실제 링크: 링크 페이지 → 목적지, 그룹·대분류 → 첫 하위 항목(원본 동작), 그 외 → 트리 경로 */
export function hrefOf(node: MenuNode): string {
  if (node.redirectTo) return node.redirectTo
  if (node.children.length > 0) return hrefOf(node.children[0]!)
  if (node.depth === 0) return DEDICATED_LANDING[node.slug] ?? `/${node.slug}`
  return node.path
}

export interface MenuRow {
  id: string
  parent_id: string | null
  label: string
  slug: string
  depth: number
  sort_order: number
  page_id: string | null
  is_visible?: boolean
  pages: MenuLinkPage | MenuLinkPage[] | null
}

/** menus 행 목록 → 트리 (보이는 행만, 3단까지: 대분류 > 소분류/그룹 > 항목) */
export function buildMenuTree(allRows: MenuRow[]): MenuNode[] {
  const rows = allRows.filter((r) => r.is_visible !== false)
  const build = (parentId: string | null, parentPath: string, depth: number): MenuNode[] =>
    rows
      .filter((r) => (parentId === null ? r.parent_id === null && r.depth === 0 : r.parent_id === parentId))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => {
        const path = `${parentPath}/${r.slug}`
        return {
          id: r.id,
          label: r.label,
          slug: r.slug,
          depth,
          pageId: r.page_id,
          redirectTo: redirectTargetOf(r.pages),
          path,
          children: depth < 2 ? build(r.id, path, depth + 1) : [],
        }
      })
  return build(null, '', 0)
}

async function loadMenuRows(): Promise<MenuRow[]> {
  // 로컬 검증용: menus 행을 JSON 파일에서 읽는다 (MENU_ROWS_FIXTURE=<path>, 운영에서는 설정하지 않음).
  // DB 를 바꾸기 전에 바뀐 메뉴 구조로 앱을 미리 띄워 보기 위한 것
  if (process.env.MENU_ROWS_FIXTURE) {
    const { readFileSync } = await import('node:fs')
    return JSON.parse(readFileSync(process.env.MENU_ROWS_FIXTURE, 'utf8')) as MenuRow[]
  }
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data } = await supabase
    .from('menus')
    .select('id, parent_id, label, slug, depth, sort_order, page_id, is_visible, pages(layout_config)')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as unknown as MenuRow[]
}

// 쿠키 없는 anon 클라이언트 + 태그 캐시 → 정적 페이지를 dynamic 으로 만들지 않음.
async function fetchMenuTree(): Promise<MenuNode[]> {
  try {
    return buildMenuTree(await loadMenuRows())
  } catch {
    return []
  }
}

const getCachedMenuTree = unstable_cache(fetchMenuTree, ['menu-tree-v1'], {
  tags: ['menus'],
  revalidate: 60,
})

/** 보이는 메뉴 전체 트리 (60초 캐시, 태그 menus) */
export async function getMenuTree(): Promise<MenuNode[]> {
  return getCachedMenuTree()
}

/** 대분류 노드 → 사이드바용 소분류 목록 (그룹은 children 포함, 링크는 실제 목적지) */
export function sectionNavOf(root: MenuNode): SectionNav {
  return {
    label: root.label,
    items: root.children.map((c) => ({
      label: c.label,
      href: hrefOf(c),
      ...(c.children.length > 0 ? { children: c.children.map((l) => ({ label: l.label, href: hrefOf(l) })) } : {}),
    })),
  }
}

const staticItem = (i: StaticMenuItem): NavItem => ({
  label: i.name,
  href: i.href,
  ...(i.children && i.children.length > 0 ? { children: i.children.map((c) => ({ label: c.name, href: c.href })) } : {}),
})

/** DB 조회 실패·소분류 없음 때 쓰는 정적 목록 (lib/menu-items) */
export function staticSectionNav(parentSlug: string): SectionNav {
  const fallback = menuData[parentSlug]
  if (!fallback) return { label: parentSlug, items: [] }
  return { label: fallback.title, items: fallback.items.map(staticItem) }
}

export async function getSectionNav(parentSlug: string): Promise<SectionNav> {
  const root = (await getMenuTree()).find((r) => r.slug === parentSlug)
  return root && root.children.length > 0 ? sectionNavOf(root) : staticSectionNav(parentSlug)
}
