'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
 */
export default function SideNav({ title, items }: SideNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label={title} className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <h2 className="typo-h3 border-b border-border bg-tint px-5 py-4 text-heading">{title}</h2>
      <ul className="p-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
