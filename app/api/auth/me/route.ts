import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 로그인한 사용자의 표시 이름·역할. 내부 오류 상세(userId, DB 힌트 등)는 응답에 싣지 않고 서버 로그에만 남긴다.
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[auth/me] profiles 조회 오류:', profileError.message)
      return NextResponse.json({ error: '프로필을 불러오지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      name: profile?.name || user.email?.split('@')[0] || '사용자',
      role: profile?.role || 'parent',
    })
  } catch (error: unknown) {
    console.error('[auth/me] 예외:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '사용자 정보를 확인하지 못했습니다.' }, { status: 500 })
  }
}
