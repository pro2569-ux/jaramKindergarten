import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRendererByType } from '@/components/page-renderers'
import DynamicPageSidebar from './DynamicPageSidebar'
import type { Metadata } from 'next'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string[] }>
}

async function fetchMenuAndPage(slugArray: string[]) {
  const supabase = await createClient()
  const [parentSlug, childSlug] = slugArray

  if (!parentSlug) return null

  // 대분류 메뉴 찾기
  const { data: parentMenu } = await supabase
    .from('menus')
    .select('id, label, slug')
    .eq('slug', parentSlug)
    .eq('depth', 0)
    .eq('is_visible', true)
    .single()

  if (!parentMenu) return null

  // 소분류가 없으면 대분류 아래 첫 번째 소분류로 이동할 정보 반환
  if (!childSlug) {
    const { data: firstChild } = await supabase
      .from('menus')
      .select('slug')
      .eq('parent_id', parentMenu.id)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    return {
      redirect: firstChild ? `/${parentSlug}/${firstChild.slug}` : null,
      parentMenu,
    }
  }

  // 소분류 메뉴 찾기 (page 데이터 조인)
  const { data: childMenu } = await supabase
    .from('menus')
    .select('id, label, slug, page_id')
    .eq('parent_id', parentMenu.id)
    .eq('slug', childSlug)
    .eq('is_visible', true)
    .single()

  if (!childMenu?.page_id) return null

  // 페이지 데이터 조회
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('id', childMenu.page_id)
    .eq('is_published', true)
    .single()

  if (!page) return null

  // 같은 대분류 아래 소분류 목록 (사이드바용)
  const { data: siblings } = await supabase
    .from('menus')
    .select('id, label, slug')
    .eq('parent_id', parentMenu.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  return {
    parentMenu,
    childMenu,
    page,
    siblings: siblings || [],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await fetchMenuAndPage(slug)

  if (!result || !('page' in result)) {
    return { title: '페이지를 찾을 수 없습니다' }
  }

  return {
    title: `${result.page.title} | 자람동산어린이집`,
    description: result.page.hero_subtitle || result.page.title,
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params
  const result = await fetchMenuAndPage(slug)

  if (!result) {
    notFound()
  }

  // 대분류만 접근한 경우 첫 번째 소분류로 리디렉트
  if ('redirect' in result && result.redirect) {
    const { redirect } = await import('next/navigation')
    redirect(result.redirect)
  }

  if (!('page' in result)) {
    notFound()
  }

  const { parentMenu, page, siblings } = result
  const parentSlug = parentMenu.slug
  const Renderer = getRendererByType(page.page_type || 'single')

  // style_config를 CSS 변수로 변환
  const styleVars: Record<string, string> = {}
  if (page.style_config) {
    const sc = page.style_config
    if (sc.primaryColor) styleVars['--page-primary'] = sc.primaryColor
    if (sc.accentColor) styleVars['--page-accent'] = sc.accentColor
    if (sc.fontFamily) styleVars['--page-font'] = sc.fontFamily
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white" style={styleVars as React.CSSProperties}>
      {/* 페이지 헤더 (Hero) */}
      <div
        className="relative bg-gradient-to-r from-primary/10 to-primary/5 border-b border-green-100"
        style={page.hero_image_url ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${page.hero_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className={`text-3xl md:text-4xl font-bold ${page.hero_image_url ? 'text-white' : 'text-gray-900'}`}>
            {page.hero_title || parentMenu.label}
          </h1>
          {page.hero_subtitle && (
            <p className={`mt-2 text-lg ${page.hero_image_url ? 'text-white/80' : 'text-gray-600'}`}>
              {page.hero_subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <aside className="lg:col-span-1">
            <DynamicPageSidebar
              parentLabel={parentMenu.label}
              parentSlug={parentSlug}
              siblings={siblings}
              currentSlug={slug}
            />
          </aside>

          {/* 콘텐츠 */}
          <div className="lg:col-span-3">
            <Renderer
              page={page}
              layoutConfig={page.layout_config || {}}
              styleConfig={page.style_config || {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
