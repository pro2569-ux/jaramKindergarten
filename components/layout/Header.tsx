'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navigation = [
  {
    name: '소개',
    href: '/about',
    children: [
      { name: '원장 인사말', href: '/about/greeting' },
      { name: '교육이념 및 원훈', href: '/about/philosophy' },
      { name: '교원 및 반편성', href: '/about/teachers' },
      { name: '교육환경', href: '/about/environment' },
      { name: '시설현황', href: '/about/facilities' },
      { name: '오시는길', href: '/about/location' },
    ],
  },
  {
    name: '보육과정',
    href: '/curriculum',
    children: [
      { name: '표준보육과정', href: '/curriculum/standard' },
      { name: '누리과정', href: '/curriculum/nuri' },
      { name: '자연주의 유아교육', href: '/curriculum/nature' },
      { name: '숲유치원 프로그램', href: '/curriculum/forest' },
    ],
  },
  {
    name: '알림마당',
    href: '/board',
    children: [
      { name: '공지사항', href: '/board/notice' },
      { name: '가정통신문', href: '/board/newsletter' },
      { name: '식단표', href: '/board/meal-plan' },
      { name: '앨범', href: '/board/album' },
    ],
  },
  {
    name: '커뮤니티',
    href: '/community',
    children: [
      { name: '문의하기', href: '/community/inquiry' },
    ],
  },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative h-16 w-16">
                <Image
                  src="/images/jaramlogo.png"
                  alt="자람동산어린이집 로고"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                자람동산어린이집
              </span>
            </Link>
          </div>

          {/* 데스크톱 네비게이션 */}
          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            {navigation.map((item, index) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => setActiveDropdown(index)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="text-gray-700 hover:text-primary font-medium transition-colors"
                >
                  {item.name}
                </Link>
                {item.children && activeDropdown === index && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-primary transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">메뉴 열기</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2 bg-white border-t">
            {navigation.map((item) => (
              <div key={item.name} className="space-y-1">
                <Link
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-green-50 hover:text-primary rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
                {item.children && (
                  <div className="pl-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-primary rounded-md"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
