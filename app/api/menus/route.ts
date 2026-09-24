import { createClient } from '@/lib/supabase/server'
import { menuHref, type MenuLinkPage } from '@/lib/menu-links'
import { NextResponse } from 'next/server'

export const revalidate = 60

// 소분류(메뉴 자식)는 없지만 전용 라우트가 따로 있는 대분류의 랜딩 경로.
// (catch-all에는 자식이 없어 bare /board, /community 접근 시 404가 나므로 실제 페이지로 보냄)
const DEDICATED_LANDING: Record<string, string> = {
  board: '/board/notice',
  community: '/community/inquiry',
}

interface MenuRow {
  id: string
  parent_id: string | null
  label: string
  slug: string
  depth: number
  sort_order: number
  is_visible: boolean
  pages: MenuLinkPage | MenuLinkPage[] | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menus')
      .select('id, parent_id, label, slug, depth, sort_order, is_visible, pages(layout_config)')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as unknown as MenuRow[]

    // 트리 구조로 변환. 게시판 링크 항목(pages.layout_config.redirectTo)은 목적지 경로로 바로 링크.
    const parents = rows
      .filter((m) => m.depth === 0)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((parent) => {
        const children = rows
          .filter((c) => c.parent_id === parent.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((child) => ({
            name: child.label,
            href: menuHref(parent.slug, child.slug, child.pages),
          }))

        // 자식이 있으면 첫 자식으로 (대분류 클릭 = 첫 소분류),
        // 자식이 없고 전용 라우트가 있으면 그쪽으로, 둘 다 없으면 /{slug}(준비중 안내).
        const href = children.length > 0 ? children[0]!.href : (DEDICATED_LANDING[parent.slug] ?? `/${parent.slug}`)

        return { name: parent.label, href, children }
      })

    return NextResponse.json(parents)
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
