import Link from 'next/link'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** 대분류 이름 (h1 이 아니라 <p>). 링크 필요 시 eyebrowHref */
  eyebrow?: string
  eyebrowHref?: string
  /** 페이지 제목 — 기본은 페이지 유일의 <h1>. 상세 페이지처럼 h1 이 본문 카드 안에 있으면 titleAs="p" */
  title?: string
  titleAs?: 'h1' | 'p'
  titleHref?: string
  subtitle?: string | null
  /** 히어로 이미지 변형: 어두운 오버레이 + 흰 글자 (기존 CMS hero_image_url 동작 유지) */
  heroImageUrl?: string | null
}

/**
 * 상단 띠. 브랜드 tint 배경, 대분류 eyebrow(<p>), 페이지 제목 1개, 선택 부제.
 * 띠 안쪽 여백 32(PC)/24(모바일), 컨테이너 1200px.
 */
export default function PageHeader({
  eyebrow,
  eyebrowHref,
  title,
  titleAs = 'h1',
  titleHref,
  subtitle,
  heroImageUrl,
}: PageHeaderProps) {
  const hero = !!heroImageUrl
  const heroStyle: CSSProperties | undefined = hero
    ? {
        backgroundImage: `linear-gradient(rgba(17,24,39,0.55), rgba(17,24,39,0.55)), url(${heroImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  const titleClass = cn('typo-h1', hero ? 'text-white' : 'text-heading')
  const titleNode = titleHref ? (
    <Link href={titleHref} className="rounded-control hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink">
      {title}
    </Link>
  ) : (
    title
  )

  return (
    <div className={cn('border-b border-border', hero ? 'bg-gray-900' : 'bg-tint')} style={heroStyle}>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        {eyebrow && (
          <p className={cn('page-eyebrow mb-1 text-sm font-semibold', hero ? 'text-white/80' : 'text-primary-ink')}>
            {eyebrowHref ? (
              <Link href={eyebrowHref} className="rounded-control hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink">
                {eyebrow}
              </Link>
            ) : (
              eyebrow
            )}
          </p>
        )}
        {title &&
          (titleAs === 'p' ? (
            <p className={titleClass}>{titleNode}</p>
          ) : (
            <h1 className={titleClass}>{titleNode}</h1>
          ))}
        {subtitle && (
          <p className={cn('mt-2 text-base', hero ? 'text-white/80' : 'text-muted')}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
