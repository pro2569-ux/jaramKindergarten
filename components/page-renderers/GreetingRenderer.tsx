import type { Page } from '@/types/database'

/**
 * greeting(원장 인사말) 전용 렌더러.
 * - 배경: 별·구름·하트·점을 인라인 SVG로 직접 그려 은은하게 타일링(외부 이미지 X).
 *   색은 currentColor 그룹으로 --primary / --secondary 만 사용 → 팔레트 변경 시 패턴도 추종.
 * - 환영문구: page.hero_title (없으면 graceful 생략), 본문: page.content(좌측 정렬, 넉넉한 행간).
 * 다른 single 페이지는 이 렌더러를 타지 않음(PageRenderer의 slug 오버라이드로만 진입).
 */

// 패턴 한 타일(200×200)을 채우는 모티프. patternUnits="userSpaceOnUse"로 반복.
function PatternBg() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-[0.13]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="greeting-motifs"
          x="0"
          y="0"
          width="200"
          height="200"
          patternUnits="userSpaceOnUse"
        >
          {/* --primary 계열: 구름 + 점 */}
          <g style={{ color: 'var(--primary)' }} fill="currentColor">
            <path d="M40 56 c-3.3 0 -6 -2.7 -6 -6 c0 -3.3 2.7 -6 6 -6 c0.6 -2.3 2.7 -4 5.2 -4 c3.2 0 5.8 2.6 5.8 5.8 c2.2 0 4 1.8 4 4 c0 3.3 -2.7 6 -6 6 Z" />
            <circle cx="150" cy="60" r="3" />
            <circle cx="60" cy="120" r="3.5" />
            <circle cx="120" cy="180" r="2.5" />
            <path d="M150 132 c-3.3 0 -6 -2.7 -6 -6 c0 -3.3 2.7 -6 6 -6 c0.6 -2.3 2.7 -4 5.2 -4 c3.2 0 5.8 2.6 5.8 5.8 c2.2 0 4 1.8 4 4 c0 3.3 -2.7 6 -6 6 Z" />
          </g>

          {/* --secondary 계열: 별(스파클) + 하트 + 점 */}
          <g style={{ color: 'var(--secondary)' }} fill="currentColor">
            {/* 별(sparkle) */}
            <path d="M30 26 c1 6 4 9 10 10 c-6 1 -9 4 -10 10 c-1 -6 -4 -9 -10 -10 c6 -1 9 -4 10 -10 Z" />
            <path d="M105 108 c0.7 4 2.7 6 6.5 6.7 c-3.8 0.7 -5.8 2.7 -6.5 6.5 c-0.7 -3.8 -2.7 -5.8 -6.5 -6.5 c3.8 -0.7 5.8 -2.7 6.5 -6.7 Z" />
            {/* 하트 */}
            <path d="M168 168 c0 0 -8 -5.4 -8 -10.5 c0 -2.5 2 -4.5 4.5 -4.5 c1.7 0 3 1.1 3.5 2.2 c0.5 -1.1 1.8 -2.2 3.5 -2.2 c2.5 0 4.5 2 4.5 4.5 c0 5.1 -8 10.5 -8 10.5 Z" />
            <circle cx="180" cy="30" r="2.5" />
            <circle cx="30" cy="170" r="2.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#greeting-motifs)" />
    </svg>
  )
}

export default function GreetingRenderer({ page }: { page: Page }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl px-6 py-12 md:px-12 md:py-16"
      // 아주 옅은 테마 그라데이션 배경 → 팔레트 변경 시 함께 변함
      style={{
        backgroundImage:
          'linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, white), color-mix(in srgb, var(--secondary) 7%, white))',
      }}
    >
      <PatternBg />

      <div className="relative z-10">
        {/* 상단 배지 */}
        <div className="flex justify-center">
          <span
            className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              color: 'var(--primary)',
              backgroundColor: 'color-mix(in srgb, var(--primary) 14%, white)',
            }}
          >
            {page.title}
          </span>
        </div>

        {/* 환영문구 (hero_title 없으면 graceful 생략) */}
        {page.hero_title && (
          <h2 className="mt-5 text-center text-[26px] font-bold leading-snug text-gray-800">
            {page.hero_title}
          </h2>
        )}

        {/* 노란(secondary) 짧은 구분선 */}
        <div
          className="mx-auto mt-5 h-1 w-16 rounded-full"
          style={{ backgroundColor: 'var(--secondary)' }}
        />

        {/* 본문: content 그대로, 좌측 정렬·넉넉한 행간 */}
        <div
          className="prose prose-lg mx-auto mt-8 max-w-2xl text-left leading-[1.9]"
          dangerouslySetInnerHTML={{ __html: page.content ?? '' }}
        />

        {/* 서명 (우측 정렬, 고정 문구) */}
        <div className="mx-auto mt-12 max-w-2xl text-right text-gray-500">
          <p className="font-semibold text-gray-700">자람동산 어린이집</p>
          <p className="text-sm">원장 드림</p>
        </div>
      </div>
    </section>
  )
}
