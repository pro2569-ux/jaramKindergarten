'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, LogIn, LogOut, Settings, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  children?: { name: string; href: string }[]
}

// DB 로드 전 초기 표시용 (깜빡임 방지)
const fallbackNavigation: NavItem[] = [
  { name: '어린이집소개', href: '/about', children: [] },
  { name: '교육프로그램', href: '/curriculum', children: [] },
  { name: '입학안내', href: '/admission', children: [] },
  { name: '교육활동이야기', href: '/board', children: [] },
  { name: '커뮤니티', href: '/community', children: [] },
]

export default function Header() {
  const [navigation, setNavigation] = useState<NavItem[]>(fallbackNavigation)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userName') || ''
    }
    return ''
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // 모바일 아코디언: 기본은 현재 경로가 속한 대분류만 펼침. 사용자가 누르면 그 경로에서의 선택을 기억한다 (effect 없이 파생)
  const [sectionChoice, setSectionChoice] = useState<{ path: string; name: string | null } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const sectionContains = (item: NavItem) =>
    (item.children ?? []).some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
  const currentSection = navigation.find(sectionContains)
  const mobileOpenSection = sectionChoice?.path === pathname ? sectionChoice.name : (currentSection?.name ?? null)
  const setMobileOpenSection = (name: string | null) => setSectionChoice({ path: pathname, name })

  // menus 테이블에서 네비게이션 조회
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch('/api/menus')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            setNavigation(data)
          }
        }
      } catch (error) {
        console.error('메뉴 조회 실패:', error)
      }
    }

    fetchMenus()
  }, [])

  // 인증 상태 확인
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (!session?.user) {
        localStorage.removeItem('userName')
        setUserName('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // user가 설정되면 API를 통해 프로필 이름 조회
  useEffect(() => {
    if (!user) return

    const fetchProfileName = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (!response.ok) {
          alert(`프로필 조회 실패 (${response.status}): ${data.error || '알 수 없는 오류'}`)
          console.error('프로필 조회 실패:', data)
          return
        }

        if (!data.name) {
          alert(`프로필 name 컬럼 값이 없습니다. 응답: ${JSON.stringify(data)}`)
          console.error('프로필 name 누락:', data)
          return
        }

        setUserName(data.name)
        localStorage.setItem('userName', data.name)
      } catch (error) {
        alert(`프로필 조회 중 예외 발생: ${error instanceof Error ? error.message : String(error)}`)
        console.error('프로필 조회 예외:', error)
      }
    }

    fetchProfileName()
  }, [user])

  // 로그아웃 핸들러
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // 로컬스토리지에서 userName 삭제
      localStorage.removeItem('userName')

      await fetch('/api/auth/logout', { method: 'POST' })
      // 강제 새로고침하며 메인으로 이동
      window.location.href = '/'
    } catch (error) {
      console.error('로그아웃 실패:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-28 items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center py-2">
              <div className="relative h-44 w-44">
                <Image
                  src="/images/jaramlogo.png"
                  alt="자람동산어린이집 로고"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* 데스크톱 네비게이션 */}
          <div className="hidden lg:flex lg:items-center lg:space-x-8 lg:flex-1 lg:justify-end">
            {navigation.map((item, index) => (
              <div
                key={item.name}
                className="relative group"
                onMouseEnter={() => setActiveDropdown(index)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="text-gray-700 hover:text-primary-ink font-semibold transition-all py-2 px-3 block rounded-lg hover:bg-tint"
                >
                  {item.name}
                </Link>
                {item.children && (
                  <div
                    className={`absolute left-0 top-full mt-0 w-56 rounded-card bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200 ${
                      activeDropdown === index
                        ? 'opacity-100 visible translate-y-0'
                        : 'opacity-0 invisible -translate-y-2'
                    }`}
                    onMouseEnter={() => setActiveDropdown(index)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-tint hover:text-primary-ink transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 로그인/로그아웃 버튼 */}
            <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-200">
              {user ? (
                <>
                  {userName && (
                    <span className="text-sm font-medium text-gray-700 px-2">
                      {userName}님
                    </span>
                  )}
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-ink hover:bg-tint rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    관리자
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-control transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-control transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    로그인
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">{mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 모바일 메뉴: 대분류 아코디언(현재 대분류만 펼침), 헤더 아래 화면 높이 안에서 스크롤 */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-7rem)] overflow-y-auto border-t bg-white lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => {
              const hasChildren = !!item.children && item.children.length > 0
              const isOpen = mobileOpenSection === item.name
              const sectionActive = (item.children ?? []).some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
              return (
                <div key={item.name} className="space-y-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setMobileOpenSection(isOpen ? null : item.name)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-base font-semibold hover:bg-tint hover:text-primary-ink',
                        sectionActive ? 'text-primary-ink' : 'text-gray-900'
                      )}
                    >
                      {item.name}
                      <ChevronDown className={cn('h-5 w-5 text-muted transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="block rounded-md px-3 py-2.5 text-base font-semibold text-gray-900 hover:bg-tint hover:text-primary-ink"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )}
                  {hasChildren && isOpen && (
                    <div className="space-y-0.5 pb-1 pl-3">
                      {item.children!.map((child) => {
                        const active = pathname === child.href || pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'block rounded-md px-3 py-2 text-sm hover:bg-tint hover:text-primary-ink',
                              active ? 'bg-primary font-medium text-on-primary' : 'text-gray-700'
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 모바일 로그인/로그아웃 버튼 */}
            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-tint rounded-control">
                    {userName ? `${userName}님 환영합니다` : ''}
                  </div>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-900 hover:bg-tint hover:text-primary-ink rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    관리자 페이지
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-base font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-control disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 w-full px-3 py-2 text-base font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-control"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="w-5 h-5" />
                    로그인
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
