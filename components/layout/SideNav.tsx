'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SideNavItem {
  label: string
  href: string
  /** 원본의 3단 메뉴 그룹 — 그룹 아래 항목들. 그룹 href 는 첫 항목 */
  children?: { label: string; href: string }[]
}

interface SideNavProps {
  title: string
  items: SideNavItem[]
}

/**
 * 좌측 소분류 내비 (CMS 페이지·정적 페이지·게시판 공통).
 * 활성 항목: primary 배경 + on-primary 글자. hover: tint 배경 + primary-ink 글자.
 * 그룹(children)은 소제목처럼 보이고 그 아래 항목이 들여쓰기로 묶인다 (항상 펼침, 현재 위치 강조).
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
  // 현재 위치 라벨: 그룹 안 항목이면 "그룹 · 항목"
  let currentLabel: string | null = null
  for (const item of items) {
    const leaf = item.children?.find((c) => isActiveHref(c.href))
    if (leaf) {
      currentLabel = `${item.label} · ${leaf.label}`
      break
    }
    if (!item.children && isActiveHref(item.href)) {
      currentLabel = item.label
      break
    }
  }

  const linkClass = (active: boolean) =>
    cn(
      'block rounded-control px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink',
      active ? 'bg-primary text-on-primary' : 'text-body hover:bg-tint hover:text-primary-ink'
    )

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
          <span className="block truncate text-base font-semibold text-heading">{currentLabel ?? '메뉴 선택'}</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <ul id={listId} className={cn('p-2', open ? 'block' : 'hidden', 'lg:block')}>
        {items.map((item) => {
          if (item.children && item.children.length > 0) {
            const groupActive = item.children.some((c) => isActiveHref(c.href))
            return (
              <li key={item.href} className="mt-1 first:mt-0">
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-control px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-tint hover:text-primary-ink',
                    groupActive ? 'text-primary-ink' : 'text-heading'
                  )}
                >
                  {item.label}
                </Link>
                <ul className="mb-1 ml-4 border-l-2 border-border pl-1">
                  {item.children.map((leaf) => {
                    const isActive = isActiveHref(leaf.href)
                    return (
                      <li key={leaf.href}>
                        <Link href={leaf.href} aria-current={isActive ? 'page' : undefined} className={cn(linkClass(isActive), 'py-2.5')}>
                          {leaf.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          }
          const isActive = isActiveHref(item.href)
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={linkClass(isActive)}>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
