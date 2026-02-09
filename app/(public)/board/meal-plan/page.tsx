'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, UtensilsCrossed } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function MealPlanPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mealPlans, setMealPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    // TODO: Supabase에서 식단표 데이터 가져오기
    // 현재는 더미 데이터 사용
    setMealPlans([])
    setLoading(false)
  }, [year, month])

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
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">식단표</h1>
          <p className="text-gray-600">
            우리 아이들의 건강한 식단을 확인하세요
          </p>
        </div>

        {/* 월 선택 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>

              <div className="flex items-center gap-4">
                <CardTitle className="text-2xl">
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
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* 캘린더 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center font-semibold py-2 ${
                    index === 0
                      ? 'text-red-500'
                      : index === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
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
                    className={`aspect-square border rounded-lg p-2 ${
                      isToday ? 'bg-primary/10 border-primary' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        dayOfWeek === 0
                          ? 'text-red-500'
                          : dayOfWeek === 6
                          ? 'text-blue-500'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>
                    {/* TODO: 식단 정보 표시 */}
                    <div className="text-xs text-gray-500 line-clamp-3">
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
                        <Download className="w-4 h-4" />
                        다운로드
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {year}년 {month}월 식단표가 아직 등록되지 않았습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
