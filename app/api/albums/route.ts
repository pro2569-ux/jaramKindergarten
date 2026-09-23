import { createClient } from '@/lib/supabase/server'
import { withResolvedMedia } from '@/lib/storage/media'
import { NextResponse } from 'next/server'

// 공개 앨범 목록 (갤러리 렌더러용). 이관 앨범의 커버(legacy-media 버킷)는 서버에서 서명 URL 로 바꿔 내려준다.
// 서명 URL 만료(1시간)보다 짧게 캐시.
export const revalidate = 60

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('albums')
      .select('id, title, cover_image_url, event_date, created_at')
      .eq('is_published', true)
      .order('event_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const albums = await withResolvedMedia(data ?? [], 'cover_image_url')
    return NextResponse.json({ albums })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '앨범 목록을 불러오지 못했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
