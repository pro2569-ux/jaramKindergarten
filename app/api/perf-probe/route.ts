import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getMenuTree } from '@/lib/site-nav'
import { getSiteSettings } from '@/lib/site-settings'
import { resolveMediaUrl } from '@/lib/storage/media'

/**
 * 서버 쪽 시간 분해 프로브 — 함수 실행 지역, 콜드 스타트 여부, Supabase 쿼리·인증·서명 URL·캐시 조회 각각의 소요 시간.
 * 프리뷰 배포는 Vercel 로그인 보호가 걸려 밖에서 부를 수 없어 운영에서도 응답한다.
 * 숫자(밀리초)와 지역 이름만 돌려주고, 데이터를 바꾸지 않으며 비밀 값을 노출하지 않는다. IP 당 분당 6회로 제한.
 */
export const dynamic = 'force-dynamic'

const bootedAt = Date.now()
let invocations = 0
const hits = new Map<string, number[]>()
const RATE_LIMIT = 6
const RATE_WINDOW_MS = 60_000

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return NextResponse.json({ error: '잠시 후 다시 시도하세요.' }, { status: 429 })
  recent.push(now)
  hits.set(ip, recent)
  invocations += 1
  const t: Record<string, number | string> = {}
  const time = async (name: string, fn: () => PromiseLike<unknown>) => {
    const s = performance.now()
    try {
      await fn()
    } catch (e) {
      t[`${name}_error`] = String(e instanceof Error ? e.message : e).slice(0, 80)
    }
    t[name] = Math.round(performance.now() - s)
  }
  const sb = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  await time('sb_settings_1row_first', () => sb.from('site_settings').select('key').limit(1))
  await time('sb_settings_1row_again', () => sb.from('site_settings').select('key').limit(1))
  await time('sb_posts_notice_5', () => sb.from('posts').select('id, title').eq('board_type', 'notice').eq('is_published', true).limit(5))
  await time('sb_menus_all', () => sb.from('menus').select('*').order('sort_order'))
  await time('sb_page_by_slug', () => sb.from('pages').select('id, slug, content').eq('slug', 'greeting').limit(1))
  await time('sb_auth_getUser_no_cookie', () => sb.auth.getUser())
  await time('parallel_3_queries', () =>
    Promise.all([
      sb.from('site_settings').select('key').limit(1),
      sb.from('posts').select('id').eq('board_type', 'notice').limit(5),
      sb.from('menus').select('id').limit(5),
    ])
  )
  let sampleRef: string | null = null
  await time('sb_album_photo_ref', async () => {
    const { data } = await sb.from('album_photos').select('image_url').limit(1)
    sampleRef = (data?.[0]?.image_url as string | undefined) ?? null
  })
  if (sampleRef) await time('signed_url_1', () => resolveMediaUrl(sampleRef, 60))
  await time('menu_tree_cached', () => getMenuTree())
  await time('site_settings_cached', () => getSiteSettings())
  return NextResponse.json(
    {
      region: process.env.VERCEL_REGION ?? 'local',
      env: process.env.VERCEL_ENV ?? 'local',
      coldStart: invocations === 1,
      invocations,
      bootAgeMs: Date.now() - bootedAt,
      node: process.version,
      timingsMs: t,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
