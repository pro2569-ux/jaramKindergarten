'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CONTACT_KEYS, HOME_KEYS } from '@/lib/site-settings'

/** 관리자 > 사이트 설정 저장. 허용된 키만 upsert (RLS: admin 만 쓸 수 있음) */
const EDITABLE_KEYS = new Set<string>([...CONTACT_KEYS, ...HOME_KEYS, 'site_description', 'established_date'])
const DESCRIPTIONS: Record<string, string> = {
  home_show_intro: '메인 화면 — 어린이집 소개 섹션 표시 (true/false)',
  home_show_albums: '메인 화면 — 최근 앨범 섹션 표시 (true/false)',
  site_name: '사이트 이름',
  site_description: '사이트 설명',
  established_date: '설립일',
  address: '주소',
  address_detail: '주소 상세 (지번 등)',
  phone: '대표 전화번호',
  mobile: '휴대전화',
  fax: '팩스 번호',
  email: '대표 이메일',
  business_hours: '운영 시간',
  transit_bus: '오시는길 — 버스',
  transit_subway: '오시는길 — 지하철',
  transit_car: '오시는길 — 자가용',
  kakao_map_lat: '카카오맵 위도',
  kakao_map_lng: '카카오맵 경도',
}

export async function saveSiteSettings(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const rows: Array<{ key: string; value: string; description: string }> = []
  for (const [key, raw] of formData.entries()) {
    if (!EDITABLE_KEYS.has(key) || typeof raw !== 'string') continue
    rows.push({ key, value: raw.trim().slice(0, 500), description: DESCRIPTIONS[key] ?? key })
  }
  if (rows.length === 0) redirect('/admin/settings?error=empty')
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) redirect(`/admin/settings?error=${encodeURIComponent(error.message.slice(0, 120))}`)
  revalidateTag('site-settings', 'max')
  revalidatePath('/about/location')
  revalidatePath('/')
  redirect('/admin/settings?saved=1')
}
