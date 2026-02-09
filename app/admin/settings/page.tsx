import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Save } from 'lucide-react'

export const metadata = {
  title: '사이트 설정',
}

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  // 사이트 설정 가져오기
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .order('key')

  // 설정을 객체로 변환
  const settingsObj = settings?.reduce((acc: any, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {}) || {}

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">사이트 설정</h1>
        <p className="mt-2 text-gray-600">
          어린이집 기본 정보와 사이트 설정을 관리합니다
        </p>
      </div>

      <form className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="사이트 이름"
              defaultValue={settingsObj.site_name || ''}
              placeholder="자람동산어린이집"
            />
            <Input
              label="사이트 설명"
              defaultValue={settingsObj.site_description || ''}
              placeholder="아이들이 건강하게 자라는 곳"
            />
            <Input
              label="설립일"
              type="date"
              defaultValue={settingsObj.established_date || ''}
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
              defaultValue={settingsObj.phone || ''}
              placeholder="02-1234-5678"
            />
            <Input
              label="팩스"
              defaultValue={settingsObj.fax || ''}
              placeholder="02-1234-5679"
            />
            <Input
              label="이메일"
              type="email"
              defaultValue={settingsObj.email || ''}
              placeholder="info@jaramk.com"
            />
            <Input
              label="주소"
              defaultValue={settingsObj.address || ''}
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
              defaultValue={settingsObj.business_hours || ''}
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
              defaultValue={settingsObj.kakao_map_lat || ''}
              placeholder="37.5665"
            />
            <Input
              label="경도 (Longitude)"
              defaultValue={settingsObj.kakao_map_lng || ''}
              placeholder="126.9780"
            />
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2">
            <Save className="w-5 h-5" />
            설정 저장
          </Button>
        </div>
      </form>
    </div>
  )
}
