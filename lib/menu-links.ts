/**
 * 메뉴 항목의 실제 링크 경로.
 *
 * menus 는 (parent.slug, child.slug) 로 `/{parent}/{child}` 경로를 만든다. 게시판처럼 다른 라우트로 보내야 하는
 * 항목은 연결된 pages 행의 layout_config.redirectTo 에 목적지 경로를 둔다 ("링크 페이지").
 *  - 헤더·모바일 메뉴·사이드바는 redirectTo 가 있으면 그 경로로 바로 링크한다
 *  - catch-all 라우트(/{parent}/{child})로 직접 들어오면 redirectTo 로 리디렉트한다
 * (menus.url 컬럼을 추가하는 DDL 없이 같은 효과를 내기 위한 방식)
 */
export interface MenuLinkPage {
  layout_config?: Record<string, unknown> | null
}

export function redirectTargetOf(page: MenuLinkPage | MenuLinkPage[] | null | undefined): string | null {
  const p = Array.isArray(page) ? page[0] : page
  const target = p?.layout_config?.redirectTo
  return typeof target === 'string' && target.startsWith('/') ? target : null
}

export function menuHref(parentSlug: string, childSlug: string, page?: MenuLinkPage | MenuLinkPage[] | null): string {
  return redirectTargetOf(page) ?? `/${parentSlug}/${childSlug}`
}
