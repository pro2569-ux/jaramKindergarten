import { NextRequest, NextResponse } from 'next/server'
import { getAlbumsByCategory } from '@/lib/public-data'

// 공개 앨범 목록 (갤러리 렌더러의 브라우저 폴백용 — 보통은 페이지가 서버에서 initialAlbums 로 넘긴다).
// 이관 앨범의 커버(legacy-media 버킷)는 로더가 서명 URL 로 바꿔 준다. ?category=자람반 으로 반별 필터.
export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim() || null
    const albums = await getAlbumsByCategory(category)
    return NextResponse.json({ albums })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '앨범 목록을 불러오지 못했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
