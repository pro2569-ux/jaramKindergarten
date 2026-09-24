/**
 * 첨부파일 표시 이름.
 * - 이관 글: legacy_meta.attachmentNames[i] (원본 파일명) 우선, 없으면 URL 의 ?download= 값
 * - 그 외: URL 마지막 경로 조각 (업로드 시 붙는 타임스탬프 접두어는 제거)
 */
export function attachmentLabel(url: string, index: number, legacyMeta?: Record<string, unknown> | null): string {
  const names = legacyMeta?.attachmentNames
  if (Array.isArray(names) && typeof names[index] === 'string' && names[index]) return names[index] as string
  try {
    const u = new URL(url, 'https://example.invalid')
    const dl = u.searchParams.get('download')
    if (dl) return dl
    const base = decodeURIComponent(u.pathname.split('/').pop() ?? '')
    const stripped = base.replace(/^\d{10,}[-_]/, '')
    return stripped || `첨부파일 ${index + 1}`
  } catch {
    return `첨부파일 ${index + 1}`
  }
}
