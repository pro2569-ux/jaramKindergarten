'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarItem {
  id: string
  label: string
  slug: string
}

interface Props {
  parentLabel: string
  parentSlug: string
  siblings: SidebarItem[]
  currentSlug: string[]
}

export default function DynamicPageSidebar({ parentLabel, parentSlug, siblings, currentSlug }: Props) {
  const pathname = usePathname()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden sticky top-28">
      <div className="bg-gradient-to-r from-primary to-primary-light p-4">
        <h2 className="text-lg font-bold text-white">{parentLabel}</h2>
      </div>
      <nav className="p-2">
        {siblings.map((item) => {
          const href = `/${parentSlug}/${item.slug}`
          const isActive = pathname === href
          return (
            <Link
              key={item.id}
              href={href}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-700 hover:bg-green-50 hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
