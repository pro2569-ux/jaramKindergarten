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

const HEX6 = /^#[0-9a-fA-F]{6}$/

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

// 전역 주입용 CSS 변수.
// - --primary / --secondary: 브랜드 색 (site_theme.primary_color / secondary_color)
// - --page / --body: 페이지 배경 / 본문 글자색 (site_theme.background_color / text_color, 6자리 hex 일 때만)
// - 파생 토큰(--primary-dark/-light, --tint 등)은 globals.css 가 body 에서 color-mix 로 계산하므로 주입 불필요.
// - heading_font 는 아직 토큰으로 노출하지 않음 (제목 폰트 분리는 이번 범위 밖 — 필요 시 --font-heading 추가).
export function themeToCssVars(theme: SiteTheme | null): CSSProperties | undefined {
  if (!theme) return undefined
  const vars: Record<string, string> = {
    '--primary':   theme.primary_color,
    '--secondary': theme.secondary_color,
  }
  if (theme.background_color && HEX6.test(theme.background_color)) vars['--page'] = theme.background_color
  if (theme.text_color && HEX6.test(theme.text_color)) vars['--body'] = theme.text_color
  return {
    ...vars,
    fontFamily: FONT_FAMILY[theme.body_font] ?? FONT_FAMILY.pretendard,
  } as CSSProperties
}
