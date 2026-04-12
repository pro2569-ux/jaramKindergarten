import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json(
        { error: `인증 오류: ${authError.message}`, authError },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: '로그인된 사용자가 없습니다.' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        {
          error: `profiles 조회 오류: ${profileError.message}`,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
          userId: user.id,
        },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'profiles 테이블에 해당 사용자의 레코드가 없습니다.', userId: user.id },
        { status: 404 }
      )
    }

    if (!profile.name) {
      return NextResponse.json(
        { error: 'profiles.name 컬럼이 비어있습니다.', profile, userId: user.id },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name: profile.name,
      role: profile.role || 'parent',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `서버 예외: ${error.message}`, stack: error.stack },
      { status: 500 }
    )
  }
}
