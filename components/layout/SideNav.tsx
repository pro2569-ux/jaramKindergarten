'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SideNavItem {
  label: string
  href: string
}

interface SideNavProps {
  title: string
  items: SideNavItem[]
}

/**
 * 좌측 소분류 내비 (CMS 페이지·정적 페이지·게시판 공통).
 * 활성 항목: primary 배경 + on-primary 글자. hover: tint 배경 + primary-ink 글자.
 * 모바일(lg 미만)에서는 "현재 위치 ▾" 한 줄로 접혀 있고, 누르면 목록이 펼쳐진다. 데스크톱은 항상 펼침.
 */
export default function SideNav({ title, items }: SideNavProps) {
  const pathname = usePathname()
  // 펼침 상태는 "어느 경로에서 펼쳤는지"로 기억한다 → 항목을 눌러 경로가 바뀌면 자동으로 접힌 상태가 된다 (effect 불필요)
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null)
  const listId = useId()

  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const current = items.find((item) => isActiveHref(item.href))

  return (
    <nav aria-label={title} className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <h2 className="typo-h3 hidden border-b border-border bg-tint px-5 py-4 text-heading lg:block">{title}</h2>

      {/* 모바일: 현재 위치 토글 */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 bg-tint px-5 py-3.5 text-left lg:hidden"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted">{title}</span>
          <span className="block truncate text-base font-semibold text-heading">{current?.label ?? '메뉴 선택'}</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <ul id={listId} className={cn('p-2', open ? 'block' : 'hidden', 'lg:block')}>
        {items.map((item) => {
          const isActive = isActiveHref(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded-control px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'text-body hover:bg-tint hover:text-primary-ink'
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
