import type { CookieOptions } from '@supabase/ssr'

/**
 * Supabase 인증 쿠키(sb-*-auth-token 및 청크 .0, .1 …)를
 * 영구 쿠키가 아닌 "세션 쿠키"(Expires/Max-Age 없음 → 브라우저 완전 종료 시 삭제)로 쓰기 위한 옵션 변환.
 *
 * 배경: @supabase/ssr 0.8.x는 쿠키를 쓸 때 `cookieOptions.maxAge`를 무시하고 항상 400일을 강제한다
 * (setItem / applyServerStorage 에서 `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge`를 스프레드 뒤에 덮어씀).
 * 따라서 우리 쪽 `cookies.setAll` 콜백 단계에서 maxAge / expires 를 제거해야 한다.
 *
 * 주의: 삭제용 쓰기(ssr은 `maxAge: 0`으로 삭제)는 그대로 통과시켜야 로그아웃 시 쿠키가 실제로 지워진다.
 */

/** 삭제 목적의 쿠키 쓰기인지 판별 (maxAge <= 0 또는 expires가 과거) */
export function isCookieDeletion(options: CookieOptions | undefined): boolean {
  if (!options) return false
  if (typeof options.maxAge === 'number' && options.maxAge <= 0) return true
  if (options.expires instanceof Date && options.expires.getTime() <= Date.now()) return true
  return false
}

/**
 * maxAge / expires 를 제거해 세션 쿠키 옵션으로 변환한다.
 * path / sameSite / secure / httpOnly / domain 등 나머지 속성은 그대로 유지.
 * 삭제용 쓰기는 변환하지 않고 원본을 반환한다.
 */
export function toSessionCookie(options: CookieOptions | undefined): CookieOptions {
  if (!options) return {}
  if (isCookieDeletion(options)) return options

  const sessionOptions: CookieOptions = { ...options }
  delete sessionOptions.maxAge
  delete sessionOptions.expires
  return sessionOptions
}
