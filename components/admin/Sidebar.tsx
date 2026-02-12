'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Settings,
  UtensilsCrossed,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

type NavItem =
  | { type: 'link'; name: string; href: string; icon: typeof LayoutDashboard }
  | { type: 'group'; name: string }

const navigation: NavItem[] = [
  { type: 'link', name: '대시보드', href: '/admin', icon: LayoutDashboard },

  { type: 'group', name: '콘텐츠 관리' },
  { type: 'link', name: '페이지 관리', href: '/admin/pages', icon: FileText },
  { type: 'link', name: '게시글 관리', href: '/admin/posts', icon: FileText },
  { type: 'link', name: '앨범 관리', href: '/admin/albums', icon: ImageIcon },
  { type: 'link', name: '식단표 관리', href: '/admin/meal-plans', icon: UtensilsCrossed },

  { type: 'group', name: '운영 관리' },
  { type: 'link', name: '교직원 관리', href: '/admin/teachers', icon: Users },
  { type: 'link', name: '문의 관리', href: '/admin/inquiries', icon: MessageSquare },

  { type: 'group', name: '사이트 관리' },
  { type: 'link', name: '배너 관리', href: '/admin/banners', icon: ImageIcon },
  { type: 'link', name: '사이트 설정', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* 모바일 메뉴 버튼 */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* 오버레이 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* 로고 */}
          <div className="flex items-center gap-3 px-6 py-6 border-b">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">자</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">자람동산</h1>
              <p className="text-xs text-gray-600">관리자 페이지</p>
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.type === 'group') {
                return (
                  <div
                    key={`group-${index}`}
                    className={cn(
                      'px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider',
                      index === 1 ? 'pt-2' : ''
                    )}
                  >
                    {item.name}
                  </div>
                )
              }

              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* 로그아웃 */}
          <div className="px-4 py-4 border-t">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = '/login'
                } catch (error) {
                  console.error('로그아웃 오류:', error)
                  window.location.href = '/login'
                }
              }}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">로그아웃</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
