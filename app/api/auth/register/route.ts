import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, username, password } = await request.json()

    // 아이디를 이메일 형식으로 변환
    const email = `${username}@jaramk.com`

    const supabase = await createClient()

    // 1. Supabase Auth에 사용자 생성 (이메일 인증 건너뛰기)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          name,
          username,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: '회원가입에 실패했습니다.' }, { status: 500 })
    }

    // 2. 이메일 확인 처리 (email_confirmed_at 업데이트)
    // Supabase가 이메일 확인을 요구하므로 SQL로 직접 확인 처리
    const { error: confirmError } = await supabase.rpc('confirm_user_email', {
      user_id: authData.user.id
    })

    if (confirmError) {
      console.error('Email confirmation error:', confirmError)
      // 확인 실패 시에도 계속 진행 (이메일 확인 설정을 껐으면 문제없음)
    }

    // 3. profiles 테이블은 Database Trigger가 자동으로 생성
    // (별도의 insert 불필요)

    // 4. 자동 로그인
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // 로그인 실패해도 가입은 성공
      return NextResponse.json({
        success: true,
        message: '회원가입이 완료되었습니다. 로그인해주세요.',
        autoLogin: false
      })
    }

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      autoLogin: true,
      user: authData.user
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
