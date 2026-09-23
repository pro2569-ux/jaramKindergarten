/**
 * 이관 스크립트용 Supabase service role 클라이언트 (.env.local 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
 * 키 값은 어디에도 출력하지 않는다. RLS 를 우회하므로 이관 스크립트 안에서만 쓴다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import './paths.ts' // .env.local 로드

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('.env.local 에 NEXT_PUBLIC_SUPABASE_URL 이 없습니다.')
  return url.replace(/\/+$/, '')
}

export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('.env.local 에 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.')
  return key
}

let cached: SupabaseClient | null = null
export function adminClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(supabaseUrl(), serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return cached
}

/** PostgREST/Storage 직접 호출용 헤더 */
export function restHeaders(): Record<string, string> {
  const key = serviceRoleKey()
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}
