import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { toSessionCookie } from './cookie-options'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            // 세션 쿠키(브라우저 종료 시 삭제)로 저장 — maxAge/expires 제거
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, toSessionCookie(options))
            )
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  )
}
