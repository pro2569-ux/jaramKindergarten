'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, UtensilsCrossed } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import EmptyState from '@/components/ui/EmptyState'
import { staticSectionNav } from '@/lib/site-nav'

// 클라이언트 컴포넌트라 DB 메뉴 대신 정적 목록 사용 (menus 와 같은 구조로 유지). 식단표는 커뮤니티 소속.
const nav = staticSectionNav('community')

export default function MealPlanPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  // TODO: Supabase에서 식단표 데이터 가져오기 (현재는 빈 목록)
  const mealPlans: { id: string; title: string; file_url?: string }[] = []

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // 달력 생성
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // 이전 달의 빈 칸
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // 현재 달의 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const days = getDaysInMonth()
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <PageShell
      eyebrow={nav.label}
      title="식단표"
      subtitle="우리 아이들의 건강한 식단을 확인하세요"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      card={false}
    >
      {/* 월 선택 (모바일에서는 제목 줄과 이전/다음 줄로 나뉨) */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              이전
            </Button>

            <div className="flex items-center gap-4">
              <CardTitle className="typo-h2">
                {year}년 {month}월
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                오늘
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="gap-1"
            >
              다음
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* 캘린더 헤더 */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`py-2 text-center font-semibold ${
                  index === 0
                    ? 'text-red-500'
                    : index === 6
                    ? 'text-blue-500'
                    : 'text-body'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 날짜 */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() + 1 &&
                year === new Date().getFullYear()

              const dayOfWeek = index % 7

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-control border p-2 ${
                    isToday ? 'border-primary bg-tint' : 'border-border bg-surface'
                  }`}
                >
                  <div
                    className={`mb-1 text-sm font-semibold ${
                      dayOfWeek === 0
                        ? 'text-red-500'
                        : dayOfWeek === 6
                        ? 'text-blue-500'
                        : 'text-body'
                    }`}
                  >
                    {day}
                  </div>
                  {/* TODO: 식단 정보 표시 */}
                  <div className="line-clamp-3 text-xs text-muted">
                    {/* 식단 내용이 여기 표시됩니다 */}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 주간 식단표 목록 (선택사항) */}
      <div className="space-y-4">
        {mealPlans.length > 0 ? (
          mealPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.title}</CardTitle>
                  {plan.file_url && (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      다운로드
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState
              icon={UtensilsCrossed}
              title={`${year}년 ${month}월 식단표가 아직 등록되지 않았습니다.`}
              description="식단표가 등록되면 이곳에서 확인하실 수 있어요."
            />
          </Card>
        )}
      </div>
    </PageShell>
  )
}
