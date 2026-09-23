import { createBrowserClient } from '@supabase/ssr'
import { parse, serialize } from 'cookie'
import { toSessionCookie } from './cookie-options'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 기본 document.cookie 핸들러 대신 직접 구현 → setAll에서 세션 쿠키로 변환하기 위함.
      // SSR/프리렌더 중(document 없음)에는 읽기는 빈 배열, 쓰기는 no-op으로 안전하게 동작.
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          const parsed = parse(document.cookie)
          return Object.keys(parsed).map((name) => ({
            name,
            value: parsed[name] ?? '',
          }))
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            // 세션 쿠키(브라우저 종료 시 삭제)로 저장 — maxAge/expires 제거
            document.cookie = serialize(name, value, toSessionCookie(options))
          })
        },
      },
    }
  )
}
