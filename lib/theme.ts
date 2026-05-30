import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import type { CSSProperties } from 'react'
import type { SiteTheme } from '@/types/database'

// ── 폰트 패밀리 맵 (catch-all에서 이전) ────────────────────────
const FONT_FAMILY: Record<string, string> = {
  pretendard: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  nanum:      "'Nanum Gothic', sans-serif",
  notoserif:  "'Noto Serif KR', serif",
}

// revalidateTag(SITE_THEME_TAG)로 테마 캐시 무효화 (admin 저장 시)
export const SITE_THEME_TAG = 'site-theme'

// 쿠키 없는 anon 클라이언트로 활성 테마 1행 조회.
// cookies() 미사용 → 루트 레이아웃에서 호출해도 라우트를 dynamic으로 강제하지 않음.
// 활성 테마는 공개 데이터(RLS: "Anyone can read active theme")라 anon 키로 충분.
async function fetchActiveTheme(): Promise<SiteTheme | null> {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await supabase
      .from('site_theme')
      .select('*')
      .eq('is_active', true)
      .single()
    return (data as SiteTheme | null) ?? null
  } catch {
    // DB 미연결 등 → null 폴백 (globals.css :root 기본색 사용, 빌드/렌더 깨지지 않음)
    return null
  }
}

// 태그 캐시: 요청마다 DB 히트 제거. 최대 60초 또는 admin 저장 시 즉시 무효화.
export const getActiveTheme = unstable_cache(fetchActiveTheme, ['active-site-theme'], {
  tags: [SITE_THEME_TAG],
  revalidate: 60,
})

// 전역 주입용 CSS 변수 (T1: --primary, --secondary, body 폰트).
// T2(--primary-dark/-light 등)는 globals.css에서 color-mix로 --primary에서 파생되므로 여기서 주입 불필요.
// T3(--background/--foreground)는 이번 범위에서 제외.
export function themeToCssVars(theme: SiteTheme | null): CSSProperties | undefined {
  if (!theme) return undefined
  return {
    '--primary':   theme.primary_color,
    '--secondary': theme.secondary_color,
    fontFamily:    FONT_FAMILY[theme.body_font] ?? FONT_FAMILY.pretendard,
  } as CSSProperties
}
