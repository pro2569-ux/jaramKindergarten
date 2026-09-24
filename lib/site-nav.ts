import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { menuData } from '@/lib/menu-items'

export interface SectionNav {
  label: string
  items: { label: string; href: string }[]
}

// 대분류(slug) 아래 소분류 목록을 menus 테이블에서 조회 (사이드바용).
// 쿠키 없는 anon 클라이언트 + 태그 캐시 → 정적 페이지를 dynamic 으로 만들지 않음.
// 소분류가 없는 대분류(board, community 등)는 lib/menu-items 의 정적 목록으로 폴백.
async function fetchSectionNav(parentSlug: string): Promise<SectionNav | null> {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: parent } = await supabase
      .from('menus')
      .select('id, label')
      .eq('slug', parentSlug)
      .eq('depth', 0)
      .eq('is_visible', true)
      .single()
    if (!parent) return null

    const { data: children } = await supabase
      .from('menus')
      .select('label, slug')
      .eq('parent_id', parent.id)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
    if (!children || children.length === 0) return null

    return {
      label: parent.label,
      items: children.map((c) => ({ label: c.label, href: `/${parentSlug}/${c.slug}` })),
    }
  } catch {
    return null
  }
}

const getCachedSectionNav = unstable_cache(fetchSectionNav, ['section-nav'], {
  tags: ['menus'],
  revalidate: 60,
})

export function staticSectionNav(parentSlug: string): SectionNav {
  const fallback = menuData[parentSlug as keyof typeof menuData]
  if (!fallback) return { label: parentSlug, items: [] }
  return {
    label: fallback.title,
    items: fallback.items.map((i) => ({ label: i.name, href: i.href })),
  }
}

export async function getSectionNav(parentSlug: string): Promise<SectionNav> {
  const fromDb = await getCachedSectionNav(parentSlug)
  return fromDb ?? staticSectionNav(parentSlug)
}
