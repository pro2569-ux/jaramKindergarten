'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ImageUpload from '@/components/ui/ImageUpload'
import { Plus, Trash2, FileText, Save, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface MealPlan {
  id: string
  year: number
  month: number
  week: number | null
  title: string | null
  file_url: string | null
  created_at: string
}

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function AdminMealPlansPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const [formData, setFormData] = useState({
    year: currentYear,
    month: currentMonth,
    week: '' as string | number,
    title: '',
    file_url: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadMealPlans()
  }, [selectedYear, selectedMonth])

  const loadMealPlans = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .order('week', { ascending: true, nullsFirst: true })

      if (error) throw error
      setMealPlans(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.file_url) {
      alert('식단표 이미지를 업로드해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('meal_plans').insert([{
        year: formData.year,
        month: formData.month,
        week: formData.week ? Number(formData.week) : null,
        title: formData.title || `${formData.year}년 ${formData.month}월${formData.week ? ` ${formData.week}주차` : ''} 식단표`,
        file_url: formData.file_url,
      }])

      if (error) throw error

      alert('식단표가 등록되었습니다.')
      setFormData({
        year: selectedYear,
        month: selectedMonth,
        week: '',
        title: '',
        file_url: '',
      })
      setShowForm(false)
      loadMealPlans()
    } catch (error: any) {
      alert('식단표 등록 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('meal_plans').delete().eq('id', id)

      if (error) throw error

      alert('식단표가 삭제되었습니다.')
      loadMealPlans()
    } catch (error: any) {
      alert('식단표 삭제 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">식단표 관리</h1>
          <p className="mt-2 text-gray-600">월별 식단표를 관리합니다</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-5 h-5" />
              취소
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              식단표 등록
            </>
          )}
        </Button>
      </div>

      {/* 연/월 필터 */}
      <div className="flex items-center gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}월
            </option>
          ))}
        </select>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>식단표 등록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연도
                </label>
                <select
                  value={formData.year}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      year: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  월
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      month: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주차 (선택)
                </label>
                <select
                  value={formData.week}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      week: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">월간 (전체)</option>
                  <option value="1">1주차</option>
                  <option value="2">2주차</option>
                  <option value="3">3주차</option>
                  <option value="4">4주차</option>
                  <option value="5">5주차</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식단표 이미지
              </label>
              <ImageUpload
                value={formData.file_url}
                onChange={(url) =>
                  setFormData((prev) => ({ ...prev, file_url: url }))
                }
                onRemove={() =>
                  setFormData((prev) => ({ ...prev, file_url: '' }))
                }
                folder="meals"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="w-5 h-5" />
                {isSubmitting ? '등록 중...' : '식단표 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 식단표 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mealPlans.length > 0 ? (
          mealPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-gray-200 relative">
                {plan.file_url ? (
                  <Image
                    src={plan.file_url}
                    alt={plan.title || '식단표'}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {plan.title || `${plan.year}년 ${plan.month}월${plan.week ? ` ${plan.week}주차` : ''}`}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {formatDate(plan.created_at)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-3">
            <CardContent className="p-12 text-center text-gray-500">
              {selectedYear}년 {selectedMonth}월 식단표가 없습니다
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
