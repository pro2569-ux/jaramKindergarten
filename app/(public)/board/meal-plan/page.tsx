'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface MealPlan {
  id: string
  year: number
  month: number
  week: number | null
  title: string | null
  file_url: string | null
  created_at: string
}

export default function MealPlanPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    const fetchMealPlans = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('year', year)
          .eq('month', month)
          .order('week', { ascending: true, nullsFirst: true })

        if (error) throw error
        setMealPlans(data || [])
      } catch (error) {
        console.error('식단표 로드 오류:', error)
        setMealPlans([])
      } finally {
        setLoading(false)
      }
    }

    fetchMealPlans()
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
        </Card>

        {/* 식단표 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : mealPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mealPlans.map((plan) => (
              <Card key={plan.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {plan.title || `${plan.year}년 ${plan.month}월${plan.week ? ` ${plan.week}주차` : ''} 식단표`}
                  </CardTitle>
                </CardHeader>
                {plan.file_url && (
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <Image
                      src={plan.file_url}
                      alt={plan.title || '식단표'}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
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
  )
}
