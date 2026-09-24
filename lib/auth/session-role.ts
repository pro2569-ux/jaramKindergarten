import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export interface SessionRole {
  userId: string
  email: string | null
  /** profiles.role — 프로필 행이 없으면 null */
  role: Profile['role'] | null
}

/**
 * 현재 요청의 로그인 사용자와 profiles.role 을 읽는다 (서버 컴포넌트/라우트 핸들러 전용).
 * 로그인돼 있지 않으면 null. 관리자 여부는 role === 'admin' 으로만 판단한다
 * (/api/admin/media-check 와 같은 기준). 데이터 자체는 RLS 가 지키고, 이 값은 화면 접근 차단용이다.
 */
export async function getSessionRole(): Promise<SessionRole | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as Profile['role'] | undefined) ?? null,
  }
}

export function isAdmin(session: SessionRole | null): boolean {
  return session?.role === 'admin'
}
