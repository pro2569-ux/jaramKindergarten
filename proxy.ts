import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** 관리자·인증 관련 경로 — 항상 세션을 확인·갱신한다 */
const AUTH_PATH_RE = /^\/(admin|login|api\/auth|api\/admin|api\/revalidate)(\/|$)/

/** Supabase 세션 쿠키가 있는지 (이름: sb-<ref>-auth-token[.n]) */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
}

export async function proxy(request: NextRequest) {
  // 비로그인 방문자의 공개 페이지: 세션 확인을 생략해 요청마다 Supabase 클라이언트를 만들지 않는다.
  // (/admin 은 아래 updateSession 이 예전처럼 /login 으로 보낸다 — 보호 동작은 그대로)
  if (!AUTH_PATH_RE.test(request.nextUrl.pathname) && !hasSupabaseSession(request)) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에 매칭:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - public 폴더 내 파일들 (public/*.*)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
