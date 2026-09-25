import { cn } from '@/lib/utils'

/** 대분류 이름 → 환영 띠 색 (그 외·대분류 없음은 초록) */
const SECTION_THEME: Record<string, 'yellow' | 'green' | 'pink' | 'sky' | 'mint'> = {
  어린이집소개: 'yellow',
  교육프로그램: 'green',
  입학안내: 'pink',
  교육활동이야기: 'sky',
  커뮤니티: 'mint',
}

interface SubBannerProps {
  /** 대분류 이름 (PageShell 의 eyebrow) */
  section?: string
}

/**
 * 서브 페이지 상단 환영 띠 (헤더 바로 아래, 메인 제외).
 * 그림(띠·해·구름·새)은 CSS 배경(public/deco/banner-*.svg)이라 읽히지 않고, 문구는 실제 텍스트다.
 * PC 190px / 모바일 96px.
 */
export default function SubBanner({ section }: SubBannerProps) {
  const theme = (section && SECTION_THEME[section.replace(/\s+/g, '')]) || 'green'
  return (
    <div className={cn('sub-banner', `sub-banner--${theme}`)}>
      <div className="sub-banner__inner mx-auto flex h-full max-w-[1200px] items-start justify-end px-4 pt-3 sm:px-6 md:items-center md:pb-8 md:pt-0 lg:px-8">
        <p className="sub-banner__text font-hand text-right">
          자람동산어린이집에
          <br />
          오신 것을 환영합니다.
        </p>
      </div>
    </div>
  )
}
