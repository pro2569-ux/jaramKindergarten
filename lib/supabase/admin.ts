import 'server-only'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 서버 전용 관리자(service role) 클라이언트.
 *
 * - RLS 를 우회하므로 절대 클라이언트 컴포넌트/브라우저 번들에 포함되면 안 된다 ('server-only' 로 강제).
 * - 용도는 private 버킷(legacy-media)의 서명 URL 발급처럼, 사용자 세션으로는 할 수 없는 서버 작업에 한정한다.
 * - 데이터 조회/수정에는 계속 lib/supabase/server.ts 의 세션 클라이언트를 쓴다.
 */
let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.')
  }
  cached = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return cached
}

export function hasAdminCredentials(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
}
