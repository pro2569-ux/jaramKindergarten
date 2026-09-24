/**
 * 관리자 화면(브라우저)에서 저장 직후 호출 — 해당 태그/경로의 공개 페이지 캐시를 즉시 무효화한다.
 * 서버(/api/revalidate)가 관리자 세션을 다시 확인하므로 아무나 호출해도 효과가 없다.
 * 실패해도 저장 자체는 이미 끝났고, 페이지는 늦어도 PUBLIC_REVALIDATE(5분) 안에 갱신되므로 조용히 넘어간다.
 */
export async function revalidateSite(input: { tags?: string[]; paths?: string[] }): Promise<boolean> {
  try {
    const res = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    })
    return res.ok
  } catch {
    return false
  }
}
