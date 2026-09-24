'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Settings, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

/** 헤더 메뉴 항목. 대분류 > 소분류(그룹이면 children) > 항목 — 원본(jaramk.com)의 3단 구조 */
interface NavItem {
  name: string
  href: string
  children?: NavItem[]
}

// DB 로드 전 초기 표시용 (깜빡임 방지)
const fallbackNavigation: NavItem[] = [
  { name: '어린이집소개', href: '/about', children: [] },
  { name: '교육프로그램', href: '/curriculum', children: [] },
  { name: '입학안내', href: '/admission', children: [] },
  { name: '교육활동이야기', href: '/board', children: [] },
  { name: '커뮤니티', href: '/community', children: [] },
]

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)
/** 항목 자신 또는 하위 항목에 현재 경로가 있는지 */
const contains = (item: NavItem, pathname: string): boolean =>
  isUnder(pathname, item.href) || (item.children ?? []).some((c) => contains(c, pathname))
const isGroup = (item: NavItem) => !!item.children && item.children.length > 0

/** PC 메가메뉴 열: 그룹은 자기 열, 그룹이 아닌 연속 항목은 한 열로 (원본 순서 유지) */
function columnsOf(children: NavItem[]): NavItem[][] {
  const cols: NavItem[][] = []
  for (const c of children) {
    const last = cols[cols.length - 1]
    if (isGroup(c) || !last || isGroup(last[0]!)) cols.push([c])
    else last.push(c)
  }
  return cols
}

interface HeaderProps {
  /** 루트 레이아웃이 서버에서(태그 캐시) 읽어 넘기는 메뉴. 있으면 /api/menus 를 다시 부르지 않는다 */
  initialNav?: NavItem[]
}

export default function Header({ initialNav }: HeaderProps) {
  const [navigation, setNavigation] = useState<NavItem[]>(initialNav && initialNav.length > 0 ? initialNav : fallbackNavigation)
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
  // 모바일 아코디언: 기본은 현재 경로가 속한 대분류/그룹만 펼침. 사용자가 누르면 그 경로에서의 선택을 기억한다 (effect 없이 파생)
  const [sectionChoice, setSectionChoice] = useState<{ path: string; name: string | null } | null>(null)
  const [groupChoice, setGroupChoice] = useState<{ path: string; name: string | null } | null>(null)
  const pathname = usePathname()
  const supabase = createClient()

  const currentSection = navigation.find((s) => (s.children ?? []).some((c) => contains(c, pathname)))
  const mobileOpenSection = sectionChoice?.path === pathname ? sectionChoice.name : (currentSection?.name ?? null)
  const setMobileOpenSection = (name: string | null) => setSectionChoice({ path: pathname, name })
  const currentGroup = currentSection?.children?.find((c) => isGroup(c) && contains(c, pathname))
  const mobileOpenGroup = groupChoice?.path === pathname ? groupChoice.name : (currentGroup?.name ?? null)
  const setMobileOpenGroup = (name: string | null) => setGroupChoice({ path: pathname, name })

  // menus 테이블에서 네비게이션 조회 (서버가 initialNav 를 넘겼으면 생략)
  useEffect(() => {
    if (initialNav && initialNav.length > 0) return
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
  }, [initialNav])

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

        // 실패해도 방문자에게 alert 로 내부 정보를 보여 주지 않는다 — 콘솔에만 남긴다
        if (!response.ok || !data.name) {
          console.error('프로필 조회 실패:', response.status)
          return
        }

        setUserName(data.name)
        localStorage.setItem('userName', data.name)
      } catch (error) {
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

  const dropdownLink = 'block rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-tint hover:text-primary-ink'

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
            {navigation.map((item, index) => {
              const children = item.children ?? []
              const mega = children.some(isGroup)
              const open = activeDropdown === index
              // 현재 경로가 속한 대분류 표시 (하위 항목·게시글 상세 포함)
              const active = children.some((c) => contains(c, pathname))
              return (
                <div
                  key={item.name}
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(index)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'block rounded-lg px-3 py-2 font-semibold transition-all hover:bg-tint hover:text-primary-ink',
                      active ? 'bg-tint text-primary-ink' : 'text-gray-700'
                    )}
                  >
                    {item.name}
                  </Link>
                  {children.length > 0 && (
                    <div
                      className={cn(
                        'absolute top-full z-50 rounded-card bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200',
                        // 그룹이 있는 대분류(교육프로그램)는 메가메뉴: 열마다 그룹 소제목 + 항목. 항목 아래 가운데 정렬
                        // 마지막 대분류(커뮤니티)는 오른쪽 끝에 붙어 있어 드롭다운을 오른쪽 기준으로 (뷰포트 밖으로 삐져나가 가로 스크롤 생기는 것 방지)
                        mega
                          ? 'left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2'
                          : index === navigation.length - 1
                            ? 'right-0 w-56'
                            : 'left-0 w-56',
                        open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
                      )}
                      onMouseEnter={() => setActiveDropdown(index)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      {mega ? (
                        <div className="flex divide-x divide-border p-2">
                          {columnsOf(children).map((col, ci) => (
                            <div key={ci} className="min-w-[11rem] px-1 py-1">
                              {isGroup(col[0]!) ? (
                                <>
                                  <Link
                                    href={col[0]!.href}
                                    className="block rounded-md px-3 py-2 text-sm font-semibold text-heading transition-colors hover:bg-tint hover:text-primary-ink"
                                  >
                                    {col[0]!.name}
                                  </Link>
                                  {col[0]!.children!.map((leaf) => (
                                    <Link key={leaf.href} href={leaf.href} className={cn(dropdownLink, 'py-1.5 pl-5')}>
                                      {leaf.name}
                                    </Link>
                                  ))}
                                </>
                              ) : (
                                col.map((child) => (
                                  <Link key={child.href} href={child.href} className={dropdownLink}>
                                    {child.name}
                                  </Link>
                                ))
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2">
                          {children.map((child) => (
                            <Link key={child.href} href={child.href} className={dropdownLink}>
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 관리자 로그인 상태에서만 "관리자"·"로그아웃" 표시. 비로그인 방문자에게는 로그인 링크를 두지 않는다
                (관리자는 /admin 으로 직접 접속 → /login → 로그인 후 /admin 복귀) */}
            {user && (
              <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-200">
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
              </div>
            )}
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

      {/* 모바일 메뉴: 대분류 아코디언(현재 대분류만 펼침) > 그룹 아코디언(2단 펼치면 3단), 헤더 아래 화면 높이 안에서 스크롤 */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-7rem)] overflow-y-auto border-t bg-white lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => {
              const hasChildren = !!item.children && item.children.length > 0
              const isOpen = mobileOpenSection === item.name
              const sectionActive = (item.children ?? []).some((c) => contains(c, pathname))
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
                        if (isGroup(child)) {
                          const groupOpen = mobileOpenGroup === child.name
                          const groupActive = contains(child, pathname)
                          return (
                            <div key={child.href} className="space-y-0.5">
                              <button
                                type="button"
                                aria-expanded={groupOpen}
                                onClick={() => setMobileOpenGroup(groupOpen ? null : child.name)}
                                className={cn(
                                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold hover:bg-tint hover:text-primary-ink',
                                  groupActive ? 'text-primary-ink' : 'text-gray-800'
                                )}
                              >
                                {child.name}
                                <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', groupOpen && 'rotate-180')} aria-hidden="true" />
                              </button>
                              {groupOpen && (
                                <div className="space-y-0.5 pb-1 pl-3">
                                  {child.children!.map((leaf) => {
                                    const active = isUnder(pathname, leaf.href)
                                    return (
                                      <Link
                                        key={leaf.href}
                                        href={leaf.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                          'block rounded-md px-3 py-2 text-sm hover:bg-tint hover:text-primary-ink',
                                          active ? 'bg-primary font-medium text-on-primary' : 'text-gray-700'
                                        )}
                                        onClick={() => setMobileMenuOpen(false)}
                                      >
                                        {leaf.name}
                                      </Link>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        }
                        const active = isUnder(pathname, child.href)
                        return (
                          <Link
                            key={child.href}
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

            {/* 모바일: 관리자 로그인 상태에서만 관리자·로그아웃. 비로그인이면 이 블록 자체를 그리지 않는다 */}
            {user && (
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                {userName && (
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-tint rounded-control">
                    {userName}님 환영합니다
                  </div>
                )}
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
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
