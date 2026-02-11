import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // 사용자 프로필 정보 가져오기
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('프로필 조회 에러:', profileError)
    }

    console.log('조회된 프로필:', profile)

    const finalProfile = profile || { role: 'parent', name: data.user.email?.split('@')[0] }

    return NextResponse.json({
      success: true,
      user: data.user,
      profile: finalProfile
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
