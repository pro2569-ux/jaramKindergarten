import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getSessionRole, isAdmin } from '@/lib/auth/session-role'

/**
 * 공개 페이지 캐시 즉시 갱신 (관리자 전용).
 * POST { tags?: string[], paths?: string[] } — 허용된 태그/사이트 내부 경로만 받는다.
 * 관리자 세션(profiles.role='admin')이 아니면 403. 데이터는 바꾸지 않고 캐시만 비운다.
 */
export const dynamic = 'force-dynamic'

const TAG_RE = /^(pages|posts|albums|menus|site-settings|site-theme|legacy-media|page:[0-9a-f-]{36}|post:[0-9a-f-]{36}|album:[0-9a-f-]{36}|posts:[a-z_]{1,30})$/
const PATH_RE = /^\/[A-Za-z0-9\-_/.%]{0,200}$/

export async function POST(request: NextRequest) {
  const session = await getSessionRole()
  if (!isAdmin(session)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  let body: { tags?: unknown; paths?: unknown } = {}
  try {
    body = (await request.json()) as { tags?: unknown; paths?: unknown }
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
  const tags = (Array.isArray(body.tags) ? body.tags : []).filter((t): t is string => typeof t === 'string' && TAG_RE.test(t)).slice(0, 20)
  const paths = (Array.isArray(body.paths) ? body.paths : []).filter((p): p is string => typeof p === 'string' && PATH_RE.test(p) && !p.startsWith('//')).slice(0, 20)
  if (tags.length === 0 && paths.length === 0) return NextResponse.json({ error: '갱신할 태그나 경로가 없습니다.' }, { status: 400 })

  for (const t of tags) revalidateTag(t, 'max')
  for (const p of paths) revalidatePath(p)
  return NextResponse.json({ ok: true, tags, paths }, { headers: { 'Cache-Control': 'no-store' } })
}
