import { notFound, redirect, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRendererByType } from '@/components/page-renderers'
import type { PageData } from '@/components/page-renderers/types'
import GreetingRenderer from '@/components/page-renderers/GreetingRenderer'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import ContentCard from '@/components/ui/ContentCard'
import EmptyState from '@/components/ui/EmptyState'
import ButtonLink from '@/components/ui/ButtonLink'
import { getMenuTree, hrefOf, sectionNavOf, type MenuNode, type NavItem } from '@/lib/site-nav'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string[] }>
}

type Resolved =
  | { kind: 'redirect'; to: string; permanent: boolean }
  | { kind: 'empty'; parentMenu: MenuNode }
  | { kind: 'page'; parentMenu: MenuNode; childMenu: MenuNode; page: PageData; siblings: NavItem[] }

/**
 * 경로 → 메뉴 트리 해석. 원본(jaramk.com)과 같은 3단: /대분류/소분류 또는 /대분류/그룹/항목
 * - /대분류          → 첫 소분류로 (링크 페이지면 그 목적지로)
 * - /대분류/그룹     → 그룹의 첫 항목으로 (원본 동작)
 * - /대분류/항목     → 그룹 아래로 옮겨진 항목이면 새 3단 경로로 영구 이동 (옛 2단 평탄화 URL)
 * - 링크 페이지      → pages.layout_config.redirectTo 로
 */
async function resolve(slugArray: string[]): Promise<Resolved | null> {
  const [parentSlug, childSlug, leafSlug, ...rest] = slugArray
  if (!parentSlug || rest.length > 0) return null

  const tree = await getMenuTree()
  const root = tree.find((r) => r.slug === parentSlug)
  if (!root) return null

  if (!childSlug) {
    return root.children.length > 0
      ? { kind: 'redirect', to: hrefOf(root), permanent: false }
      : { kind: 'empty', parentMenu: root }
  }

  let node = root.children.find((c) => c.slug === childSlug)
  if (!node) {
    if (!leafSlug) {
      for (const group of root.children) {
        const leaf = group.children.find((l) => l.slug === childSlug)
        if (leaf) return { kind: 'redirect', to: hrefOf(leaf), permanent: true }
      }
    }
    return null
  }
  if (node.children.length > 0) {
    if (!leafSlug) return { kind: 'redirect', to: hrefOf(node), permanent: false }
    const leaf = node.children.find((l) => l.slug === leafSlug)
    if (!leaf) return null
    node = leaf
  } else if (leafSlug) {
    return null
  }

  if (node.redirectTo) return { kind: 'redirect', to: node.redirectTo, permanent: false }
  if (!node.pageId) return null

  const supabase = await createClient()
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('id', node.pageId)
    .eq('is_published', true)
    .single()
  if (!page) return null

  return { kind: 'page', parentMenu: root, childMenu: node, page: page as unknown as PageData, siblings: sectionNavOf(root).items }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await resolve(slug)

  if (!result || result.kind !== 'page') {
    return { title: '페이지를 찾을 수 없습니다' }
  }

  // 사이트명은 루트 레이아웃의 title.template 이 한 번만 붙인다.
  return {
    title: result.page.title,
    description: result.page.hero_subtitle || result.page.title,
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params
  const result = await resolve(slug)

  if (!result) {
    notFound()
  }

  // 대분류·그룹만 접근 → 첫 하위 항목으로. 옛 2단 경로 → 새 3단 경로로 영구 이동
  if (result.kind === 'redirect') {
    if (result.permanent) permanentRedirect(result.to)
    redirect(result.to)
  }

  // 자식(소분류)이 없는 빈 대분류 접근 → 404 대신 "준비 중" 안내
  if (result.kind === 'empty') {
    return (
      <PageShell title={result.parentMenu.label} width="reading">
        <EmptyState
          icon={Construction}
          title="준비 중입니다"
          description="콘텐츠를 준비하고 있어요. 곧 찾아뵙겠습니다."
          action={<ButtonLink href="/">홈으로</ButtonLink>}
        />
      </PageShell>
    )
  }

  const { parentMenu, page, siblings, childMenu } = result
  // greeting(원장 인사말)만 전용 렌더러로 분기. 그 외는 기존 경로 그대로.
  const isGreeting = childMenu.slug === 'greeting'
  const Renderer = getRendererByType(page.page_type || 'single')

  const sc = (page.style_config || {}) as Record<string, string | undefined>

  // style_config를 CSS 변수로 변환
  const styleVars: Record<string, string> = {}
  if (sc.primaryColor) styleVars['--page-primary'] = sc.primaryColor
  if (sc.accentColor) styleVars['--page-accent'] = sc.accentColor
  if (sc.fontFamily) styleVars['--page-font'] = sc.fontFamily

  // 페이지 배경: backgroundImage가 있고 모드가 full/subtle일 때만 활성화.
  // 그 외(미설정/none/이미지 없음)는 기본 카드 경로를 탄다 → 회귀 없음.
  const bgImage: string = sc.backgroundImage || ''
  const bgMode: 'none' | 'full' | 'subtle' =
    bgImage && (sc.backgroundMode === 'full' || sc.backgroundMode === 'subtle')
      ? sc.backgroundMode
      : 'none'

  // 배경은 "콘텐츠 컬럼(우측 영역)"에만 적용한다.
  const contentBgStyle: CSSProperties = {}
  if (bgMode === 'full') {
    // 가독성용 어두운 스크림 + 이미지 (cover/center).
    // 모바일 호환을 위해 background-attachment: fixed는 쓰지 않음(iOS 깨짐 방지).
    contentBgStyle.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${bgImage})`
    contentBgStyle.backgroundSize = 'cover'
    contentBgStyle.backgroundPosition = 'center'
  } else if (bgMode === 'subtle') {
    // 같은 이미지를 밝은 오버레이로 옅게 깔기 (콘텐츠는 평소대로).
    contentBgStyle.backgroundImage = `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.92)), url(${bgImage})`
    contentBgStyle.backgroundSize = 'cover'
    contentBgStyle.backgroundPosition = 'center'
  }

  // 서버 컴포넌트라 상태가 없으므로 page_type 에 따라 고른 렌더러를 바로 그린다
  const rendered = isGreeting ? (
    <GreetingRenderer page={page} />
  ) : (
    createElement(Renderer, { page, layoutConfig: page.layout_config || {}, styleConfig: page.style_config || {} })
  )

  // 콘텐츠 컬럼 래핑: 배경 모드별 / 인사말(자체 카드) / 기본 ContentCard
  let content: ReactNode
  if (bgMode === 'full') {
    content = (
      <div className="rounded-card p-4 shadow-md sm:p-6" style={contentBgStyle}>
        <div className="rounded-card bg-surface/85 p-4 backdrop-blur md:p-6">{rendered}</div>
      </div>
    )
  } else if (bgMode === 'subtle') {
    content = (
      <div className="rounded-card border border-border p-4 shadow-sm md:p-6" style={contentBgStyle}>
        {rendered}
      </div>
    )
  } else if (isGreeting) {
    content = rendered
  } else {
    content = <ContentCard>{rendered}</ContentCard>
  }

  return (
    <PageShell
      eyebrow={parentMenu.label}
      title={page.title}
      subtitle={page.hero_subtitle ?? undefined}
      heroImageUrl={page.hero_image_url ?? undefined}
      sidebar={<SideNav title={parentMenu.label} items={siblings} />}
      card={false}
      style={styleVars as CSSProperties}
    >
      {content}
    </PageShell>
  )
}
