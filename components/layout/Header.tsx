'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, LogIn, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

const navigation = [
  {
    name: '어린이집소개',
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
    name: '교육프로그램',
    href: '/curriculum',
    children: [
      { name: '표준보육과정', href: '/curriculum/standard' },
      { name: '누리과정', href: '/curriculum/nuri' },
      { name: '자연주의 유아교육', href: '/curriculum/nature' },
      { name: '숲유치원 프로그램', href: '/curriculum/forest' },
    ],
  },
  {
    name: '입학안내',
    href: '/admission',
    children: [
      { name: '입학안내', href: '/admission/guide' },
      { name: '모집요강', href: '/admission/recruitment' },
    ],
  },
  {
    name: '교육활동이야기',
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
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 인증 상태 확인
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 사용자 프로필 정보 가져오기
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('프로필 조회 오류:', error)
        }

        console.log('프로필 데이터:', profile, 'user.email:', user.email)
        const name = profile?.name || user.email?.split('@')[0] || '사용자'
        console.log('설정할 userName:', name)

        // 디버깅: 헤더에 userName 설정
        if (name && name !== '사용자') {
          console.log('✅ userName 설정 성공:', name)
        } else {
          console.warn('⚠️ userName이 기본값입니다:', name, 'profile:', profile)
        }

        setUserName(name)
      } else {
        setUserName('')
      }
    }

    getUser()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single()

        const name = profile?.name || session.user.email?.split('@')[0] || '사용자'
        setUserName(name)
      } else {
        setUserName('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 로그아웃 핸들러
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
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
                  className="text-gray-700 hover:text-primary font-semibold transition-all py-2 px-3 block rounded-lg hover:bg-green-50"
                  style={{ fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif" }}
                >
                  {item.name}
                </Link>
                {item.children && (
                  <div
                    className={`absolute left-0 top-full mt-0 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 ${
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

            {/* 로그인/로그아웃 버튼 */}
            <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-200">
              {user ? (
                <>
                  <span className="text-sm font-medium text-gray-700 px-2">
                    {userName}님
                  </span>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    관리자
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-green-50 rounded-lg transition-colors"
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
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

            {/* 모바일 로그인/로그아웃 버튼 */}
            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-green-50 rounded-md">
                    {userName}님 환영합니다
                  </div>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium text-gray-900 hover:bg-green-50 hover:text-primary rounded-md"
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
                    className="flex items-center gap-2 w-full px-3 py-2 text-base font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-green-50 hover:text-primary rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 w-full px-3 py-2 text-base font-medium text-white bg-primary hover:bg-primary-dark rounded-md"
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
