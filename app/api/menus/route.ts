import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 60

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
      .map((parent) => ({
        name: parent.label,
        href: `/${parent.slug}`,
        children: (data || [])
          .filter((c) => c.parent_id === parent.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((child) => ({
            name: child.label,
            href: `/${parent.slug}/${child.slug}`,
          })),
      }))
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
