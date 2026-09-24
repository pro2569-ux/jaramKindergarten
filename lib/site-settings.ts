import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

/** site_settings 의 key → value. 값이 없으면 빈 문자열 */
export type SiteSettings = Record<string, string>

/** 연락처·오시는길에 쓰는 키 (관리자 > 사이트 설정에서 편집) */
export const CONTACT_KEYS = [
  'site_name',
  'address',
  'address_detail',
  'phone',
  'mobile',
  'fax',
  'email',
  'business_hours',
  'transit_bus',
  'transit_subway',
  'transit_car',
  'kakao_map_lat',
  'kakao_map_lng',
] as const

// 쿠키 없는 anon 클라이언트 + 태그 캐시(60초) — 푸터처럼 모든 페이지에 들어가는 곳에서 써도 정적 렌더를 막지 않는다.
async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await supabase.from('site_settings').select('key, value')
    const out: SiteSettings = {}
    for (const row of (data ?? []) as Array<{ key: string; value: string | null }>) out[row.key] = row.value ?? ''
    return out
  } catch {
    return {}
  }
}

const getCachedSiteSettings = unstable_cache(fetchSiteSettings, ['site-settings-v1'], {
  tags: ['site-settings'],
  revalidate: 60,
})

export async function getSiteSettings(): Promise<SiteSettings> {
  return getCachedSiteSettings()
}

/** 주소 한 줄 (주소 + 상세) */
export function fullAddress(s: SiteSettings): string {
  return [s.address, s.address_detail].filter((v) => v && v.trim()).join(' ')
}
