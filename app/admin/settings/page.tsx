import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Save } from 'lucide-react'
import { saveSiteSettings } from './actions'

export const metadata = {
  title: '사이트 설정',
}

interface PageProps {
  searchParams: Promise<{ saved?: string; error?: string }>
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const { saved, error } = await searchParams
  const supabase = await createClient()

  // 사이트 설정 가져오기
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .order('key')

  // 설정을 객체로 변환
  const s: Record<string, string> = {}
  for (const row of (settings ?? []) as Array<{ key: string; value: string | null }>) s[row.key] = row.value ?? ''

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">사이트 설정</h1>
        <p className="mt-2 text-gray-600">
          어린이집 기본 정보와 연락처, 오시는길 안내를 관리합니다. 저장하면 푸터와 오시는길 페이지에 바로 반영됩니다(최대 1분).
        </p>
      </div>

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">저장했습니다.</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">저장 실패: {error}</div>
      )}

      <form action={saveSiteSettings} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="사이트 이름" name="site_name" defaultValue={s.site_name || ''} placeholder="자람동산어린이집" />
            <Input label="사이트 설명" name="site_description" defaultValue={s.site_description || ''} placeholder="아이들이 건강하게 자라는 곳" />
            <Input label="설립일" name="established_date" type="date" defaultValue={s.established_date || ''} />
          </CardContent>
        </Card>

        {/* 연락처 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>연락처 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="주소" name="address" defaultValue={s.address || ''} placeholder="고양시 덕양구 고양대로 2002번길 16-13" />
            <Input label="주소 상세 (지번 등)" name="address_detail" defaultValue={s.address_detail || ''} placeholder="(동산동 47-88)" />
            <Input label="대표 전화 (TEL)" name="phone" defaultValue={s.phone || ''} placeholder="02-387-0188" />
            <Input label="휴대전화 (PHONE)" name="mobile" defaultValue={s.mobile || ''} placeholder="010-0000-0000" />
            <Input label="팩스 (FAX)" name="fax" defaultValue={s.fax || ''} placeholder="02-387-0183" />
            <Input label="이메일 (비우면 표시 안 함)" name="email" type="email" defaultValue={s.email || ''} placeholder="" />
          </CardContent>
        </Card>

        {/* 운영 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>운영 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="운영 시간" name="business_hours" defaultValue={s.business_hours || ''} placeholder="평일 07:30 ~ 19:30" />
          </CardContent>
        </Card>

        {/* 오시는길 */}
        <Card>
          <CardHeader>
            <CardTitle>오시는길 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea label="버스" name="transit_bus" defaultValue={s.transit_bus || ''} rows={2} placeholder="큰골입구 버스 정류장에서 하차 (9703, 730, 705, 773)" />
            <Textarea label="지하철" name="transit_subway" defaultValue={s.transit_subway || ''} rows={3} placeholder="삼송역 3번출구에서 300M 이동 → …" />
            <Textarea label="자가용" name="transit_car" defaultValue={s.transit_car || ''} rows={2} placeholder="구파발 방향에서 고봉삼계탕 보이자마자 우회전" />
          </CardContent>
        </Card>

        {/* 지도 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>지도 설정 (카카오맵)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">비워 두면 주소로 위치를 찾습니다. 지도 핀이 어긋나면 위도·경도를 직접 넣어 주세요.</p>
            <Input label="위도 (Latitude)" name="kakao_map_lat" defaultValue={s.kakao_map_lat || ''} placeholder="37.6xxxxx" />
            <Input label="경도 (Longitude)" name="kakao_map_lng" defaultValue={s.kakao_map_lng || ''} placeholder="126.8xxxxx" />
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
