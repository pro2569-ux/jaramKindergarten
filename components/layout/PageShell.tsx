import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import PageHeader, { type PageHeaderProps } from './PageHeader'
import SubBanner from './SubBanner'
import ContentCard from '@/components/ui/ContentCard'

interface PageShellProps extends PageHeaderProps {
  /** 좌측 사이드바 (보통 <SideNav/>). 260px, 데스크톱 sticky, 모바일은 본문 위 (접기는 PR D) */
  sidebar?: ReactNode
  /** 본문을 ContentCard 로 감쌀지 (기본 true). 인사말처럼 자체 카드가 있으면 false */
  card?: boolean
  /** 콘텐츠 컬럼 최대 폭: full(컨테이너) / reading(896px, 게시글 상세) / narrow(640px, 폼) */
  width?: 'full' | 'reading' | 'narrow'
  /** 상단 띠 표시 여부 (기본 true) */
  band?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * 공개 페이지 공통 셸: 상단 띠 + (사이드바) + 콘텐츠 컬럼.
 * CMS 페이지·정적 페이지·게시판이 모두 이 셸을 쓴다. 배경은 page 토큰(body)이며
 * min-h-screen 을 쓰지 않는다 — 푸터는 루트 레이아웃의 flex 로 하단에 붙는다.
 */
export default function PageShell({
  sidebar,
  card = true,
  width = 'full',
  band = true,
  className,
  style,
  children,
  ...header
}: PageShellProps) {
  return (
    <div className={cn('bg-pattern', className)} style={style}>
      {band && <SubBanner section={header.eyebrow} />}
      {band && <PageHeader {...header} />}

      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className={cn(sidebar && 'lg:flex lg:items-start lg:gap-8')}>
          {sidebar && (
            <aside className="mb-6 lg:sticky lg:top-30 lg:mb-0 lg:w-[260px] lg:shrink-0">{sidebar}</aside>
          )}

          <div
            className={cn(
              'min-w-0 flex-1',
              width === 'reading' && 'mx-auto w-full max-w-[896px]',
              width === 'narrow' && 'mx-auto w-full max-w-[640px]'
            )}
          >
            {card ? <ContentCard>{children}</ContentCard> : children}
          </div>
        </div>
      </div>
    </div>
  )
}
