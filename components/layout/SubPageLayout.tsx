'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface MenuItem {
  name: string
  href: string
}

interface SubPageLayoutProps {
  children: ReactNode
  title: string
  menuItems: MenuItem[]
}

export default function SubPageLayout({ children, title, menuItems }: SubPageLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* 페이지 헤더 */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-green-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 왼쪽 사이드바 - 하위 메뉴 */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden sticky top-28">
              <div className="bg-gradient-to-r from-primary to-primary-light p-4">
                <h2 className="text-lg font-bold text-white">{title}</h2>
              </div>
              <nav className="p-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-700 hover:bg-green-50 hover:text-primary'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* 오른쪽 콘텐츠 영역 */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
