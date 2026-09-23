import { createClient } from '@/lib/supabase/server'
import { diagnoseLegacyMedia, isLegacyMediaRef, legacyMediaPath } from '@/lib/storage/media'
import { NextResponse } from 'next/server'

// 관리자 전용 진단: private 버킷(legacy-media) 서명이 왜 안 되는지 확인한다.
// 환경변수는 존재 여부/형태만 돌려주고 값은 절대 포함하지 않는다.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return NextResponse.json({ error: '관리자만 사용할 수 있습니다.' }, { status: 403 })

    // 서명 테스트용 샘플: 이관 앨범 커버 1건 (관리자는 비공개 앨범도 조회 가능)
    const { data: album } = await supabase
      .from('albums')
      .select('id, cover_image_url')
      .like('cover_image_url', 'legacy-media:%')
      .limit(1)
      .maybeSingle()
    const samplePath = isLegacyMediaRef(album?.cover_image_url) ? legacyMediaPath(album.cover_image_url) : null

    const result = await diagnoseLegacyMedia(samplePath)
    return NextResponse.json({ checkedAt: new Date().toISOString(), sampleAlbumId: album?.id ?? null, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '진단 중 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
