import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 60

// 소분류(메뉴 자식)는 없지만 전용 라우트가 따로 있는 대분류의 랜딩 경로.
// (catch-all에는 자식이 없어 bare /board, /community 접근 시 404가 나므로 실제 페이지로 보냄)
const DEDICATED_LANDING: Record<string, string> = {
  board: '/board/notice',
  community: '/community/inquiry',
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menus')
      .select('id, parent_id, label, slug, depth, sort_order, is_visible')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 트리 구조로 변환
    const parents = (data || [])
      .filter((m) => m.depth === 0)
      .map((parent) => {
        const children = (data || [])
          .filter((c) => c.parent_id === parent.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((child) => ({
            name: child.label,
            href: `/${parent.slug}/${child.slug}`,
          }))

        // 자식이 있으면 /{slug} (catch-all이 첫 소분류로 리디렉트),
        // 자식이 없고 전용 라우트가 있으면 그쪽으로, 둘 다 없으면 /{slug}(준비중 안내).
        const href =
          children.length > 0
            ? `/${parent.slug}`
            : DEDICATED_LANDING[parent.slug] ?? `/${parent.slug}`

        return { name: parent.label, href, children }
      })
      .sort((a, b) => {
        const aParent = (data || []).find((m) => `/${m.slug}` === a.href)
        const bParent = (data || []).find((m) => `/${m.slug}` === b.href)
        return (aParent?.sort_order || 0) - (bParent?.sort_order || 0)
      })

    return NextResponse.json(parents)
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
