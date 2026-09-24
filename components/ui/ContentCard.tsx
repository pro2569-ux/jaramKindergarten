import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * 페이지 본문 카드 (PageShell 의 콘텐츠 컬럼 기본 래퍼).
 * 흰 배경 · 1px 경계선 · 16px 모서리 · 패딩 24(PC)/16(모바일).
 */
export default function ContentCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface p-4 shadow-sm md:p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}
