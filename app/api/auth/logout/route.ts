import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
