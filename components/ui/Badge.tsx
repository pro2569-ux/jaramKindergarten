import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * 배지 1종: pill, 12px, 배경 tint-strong(primary 24%) + primary-ink 글자.
 * 공지 표시 등 상태 라벨 용도. 노란 배경 위 흰 글자 배지는 더 이상 쓰지 않는다.
 */
export default function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-tint-strong px-2.5 py-0.5 text-xs font-semibold leading-5 text-primary-ink',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
