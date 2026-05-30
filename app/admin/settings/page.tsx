'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Save } from 'lucide-react'

interface FormData {
  site_name: string
  site_description: string
  established_date: string
  phone: string
  fax: string
  email: string
  address: string
  business_hours: string
  kakao_map_lat: string
  kakao_map_lng: string
}

const initialFormData: FormData = {
  site_name: '',
  site_description: '',
  established_date: '',
  phone: '',
  fax: '',
  email: '',
  address: '',
  business_hours: '',
  kakao_map_lat: '',
  kakao_map_lng: '',
}

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key')

      if (error) throw error

      const obj = (data || []).reduce((acc: Record<string, string>, s) => {
        acc[s.key] = s.value || ''
        return acc
      }, {})

      setFormData((prev) => ({ ...prev, ...obj }))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const entries = (Object.entries(formData) as [string, string][]).map(
        ([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString(),
        })
      )

      const { error } = await supabase
        .from('site_settings')
        .upsert(entries, { onConflict: 'key' })

      if (error) throw error

      alert('설정이 저장되었습니다.')
    } catch (error: any) {
      alert('설정 저장 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">사이트 설정</h1>
        <p className="mt-2 text-gray-600">
          어린이집 기본 정보와 사이트 설정을 관리합니다
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="사이트 이름"
              value={formData.site_name}
              onChange={handleChange('site_name')}
              placeholder="자람동산어린이집"
            />
            <Input
              label="사이트 설명"
              value={formData.site_description}
              onChange={handleChange('site_description')}
              placeholder="아이들이 건강하게 자라는 곳"
            />
            <Input
              label="설립일"
              type="date"
              value={formData.established_date}
              onChange={handleChange('established_date')}
            />
          </CardContent>
        </Card>

        {/* 연락처 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>연락처 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="전화번호"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="02-1234-5678"
            />
            <Input
              label="팩스"
              value={formData.fax}
              onChange={handleChange('fax')}
              placeholder="02-1234-5679"
            />
            <Input
              label="이메일"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="info@jaramk.com"
            />
            <Input
              label="주소"
              value={formData.address}
              onChange={handleChange('address')}
              placeholder="서울특별시 강남구 테헤란로 123"
            />
          </CardContent>
        </Card>

        {/* 운영 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>운영 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="운영 시간"
              value={formData.business_hours}
              onChange={handleChange('business_hours')}
              placeholder="평일 07:30 ~ 19:30"
            />
          </CardContent>
        </Card>

        {/* 지도 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>지도 설정 (카카오맵)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="위도 (Latitude)"
              value={formData.kakao_map_lat}
              onChange={handleChange('kakao_map_lat')}
              placeholder="37.5665"
            />
            <Input
              label="경도 (Longitude)"
              value={formData.kakao_map_lng}
              onChange={handleChange('kakao_map_lng')}
              placeholder="126.9780"
            />
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2" disabled={isSubmitting}>
            <Save className="w-5 h-5" />
            {isSubmitting ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
