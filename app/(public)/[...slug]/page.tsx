import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import SubPageLayout from '@/components/layout/SubPageLayout'
import PageRenderer from '@/components/page-renderers/PageRenderer'
import type { Menu, Page, SiteTheme } from '@/types/database'

// ISR: 메뉴·페이지는 관리자 저장 후 최대 60초 내 반영
export const revalidate = 60

// ── 폰트 패밀리 맵 ─────────────────────────────────────────────
const FONT_FAMILY: Record<string, string> = {
  pretendard: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  nanum:      "'Nanum Gothic', sans-serif",
  notoserif:  "'Noto Serif KR', serif",
}

// ── 타입 ───────────────────────────────────────────────────────
interface MenuItem { name: string; href: string }

interface LoadResult {
  parentMenu: Menu
  menuItems: MenuItem[]
  page: Page | null     // null = 대분류만 hit (소분류 없거나 page_id 미연결)
  theme: SiteTheme | null
}

type Props = { params: Promise<{ slug: string[] }> }

// ── 데이터 로더 (request 내 중복 제거) ────────────────────────
const loadData = cache(async (slug: string[]): Promise<LoadResult | null> => {
  // depth는 0/1 두 단계뿐이므로 3단계 이상 slug는 존재하지 않는 경로
  if (slug.length === 0 || slug.length > 2) return null

  const supabase = await createClient()
  const [parentSlug, childSlug] = slug

  // 1. 대분류 메뉴 조회
  const { data: parentRaw } = await supabase
    .from('menus')
    .select('*')
    .eq('slug', parentSlug)
    .is('parent_id', null)
    .eq('is_visible', true)
    .single()

  if (!parentRaw) return null
  const parentMenu = parentRaw as Menu

  // 2. 소분류 목록(사이드바 + 인덱스용)
  const { data: childrenRaw } = await supabase
    .from('menus')
    .select('*')
    .eq('parent_id', parentMenu.id)
    .eq('is_visible', true)
    .order('sort_order')

  const menuItems: MenuItem[] = (childrenRaw as Menu[] ?? []).map((m) => ({
    name:  m.label,
    href:  `/${parentSlug}/${m.slug}`,
  }))

  // 3. 대분류만 hit → 페이지 없음(결정 B: 인덱스 표시)
  if (!childSlug) {
    const { data: theme } = await supabase
      .from('site_theme')
      .select('*')
      .eq('is_active', true)
      .single()
    return { parentMenu, menuItems, page: null, theme: theme as SiteTheme | null }
  }

  // 4. 소분류 메뉴 조회
  const { data: childRaw } = await supabase
    .from('menus')
    .select('*')
    .eq('parent_id', parentMenu.id)
    .eq('slug', childSlug)
    .eq('is_visible', true)
    .single()

  const childMenu = childRaw as Menu | null

  // page_id 미연결(방어) → 결정 2: notFound
  if (!childMenu?.page_id) return null

  // 5. 페이지 조회 (is_published 필터)
  const { data: pageRaw } = await supabase
    .from('pages')
    .select('*')
    .eq('id', childMenu.page_id)
    .eq('is_published', true)
    .single()

  if (!pageRaw) return null
  const page = pageRaw as Page

  // 6. 활성 테마
  const { data: themeRaw } = await supabase
    .from('site_theme')
    .select('*')
    .eq('is_active', true)
    .single()

  return { parentMenu, menuItems, page, theme: themeRaw as SiteTheme | null }
})

// ── generateMetadata ───────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await loadData(slug)
  if (!data) return {}
  const title = data.page?.title ?? data.parentMenu.label
  return { title }
}

// ── 페이지 컴포넌트 ────────────────────────────────────────────
export default async function DynamicPage({ params }: Props) {
  const { slug } = await params

  if (!slug || slug.length > 2) notFound()

  const data = await loadData(slug)
  if (!data) notFound()

  const { parentMenu, menuItems, page, theme } = data

  // 테마 색상을 CSS 커스텀 프로퍼티로 주입
  // → SubPageLayout이 사용하는 `text-primary`, `bg-primary` 등이 테마값을 참조
  const themeStyle: React.CSSProperties = theme
    ? ({
        '--primary':    theme.primary_color,
        '--secondary':  theme.secondary_color,
        fontFamily:     FONT_FAMILY[theme.body_font] ?? FONT_FAMILY.pretendard,
      } as React.CSSProperties)
    : {}

  // ── 결정 B: 대분류만 hit → 소분류 인덱스 표시 ──────────────
  if (!page) {
    return (
      <div style={themeStyle}>
        <SubPageLayout title={parentMenu.label} menuItems={menuItems}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{parentMenu.label}</h2>
          {menuItems.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-green-50 transition-colors group"
                >
                  <span className="font-medium text-gray-800 group-hover:text-primary">
                    {item.name}
                  </span>
                  <span className="ml-auto text-gray-400 group-hover:text-primary text-lg">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400">
              <p className="text-lg font-medium">준비 중입니다.</p>
              <p className="text-sm mt-2">곧 콘텐츠가 추가될 예정입니다.</p>
            </div>
          )}
        </SubPageLayout>
      </div>
    )
  }

  // ── 정상 경로: 소분류 페이지 렌더 ──────────────────────────
  return (
    <div style={themeStyle}>
      <SubPageLayout title={parentMenu.label} menuItems={menuItems}>

        {/* Hero 이미지 (있을 때만) */}
        {page.hero_image_url && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6">
            <Image
              src={page.hero_image_url}
              alt={page.hero_title ?? page.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 페이지 제목 (hero_title 있으면 그걸 사용) */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {page.hero_title ?? page.title}
        </h2>

        {/* Hero 부제목 */}
        {page.hero_subtitle && (
          <p className="text-gray-600 text-lg mb-6">{page.hero_subtitle}</p>
        )}

        {/* 본문 렌더 (page_type에 따라 PageRenderer가 분기) */}
        <div className="mt-4">
          <PageRenderer page={page} />
        </div>

      </SubPageLayout>
    </div>
  )
}
