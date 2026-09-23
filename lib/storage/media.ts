import 'server-only'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { LEGACY_MEDIA_BUCKET, LEGACY_MEDIA_PREFIX } from '@/lib/constants'

/**
 * 미디어 참조 해석.
 *
 * DB 의 image_url / cover_image_url 에는 두 종류 값이 들어간다.
 *  - 공개 URL (publicImage 버킷 등): 그대로 사용
 *  - 'legacy-media:<객체 경로>' : private 버킷 legacy-media 의 객체. 서버에서 서명 URL(기본 1시간)로 바꿔서 내려준다.
 *
 * 서명은 service role 로만 가능하므로 이 모듈은 서버 전용이다. 호출하는 쪽(페이지/라우트)이
 * 공개 여부(is_published)나 관리자 권한을 이미 확인했다는 전제로 동작한다.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60

export function isLegacyMediaRef(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(LEGACY_MEDIA_PREFIX)
}

export function legacyMediaPath(ref: string): string {
  return ref.slice(LEGACY_MEDIA_PREFIX.length).replace(/^\/+/, '')
}

/**
 * 여러 참조를 한 번에 해석한다. legacy 참조만 모아 서명하고, 실패한 항목은 null.
 * 입력 순서를 그대로 유지한다.
 */
export async function resolveMediaUrls(
  refs: ReadonlyArray<string | null | undefined>,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<Array<string | null>> {
  const out: Array<string | null> = refs.map((r) => (typeof r === 'string' && r ? r : null))
  const legacyIdx = refs.map((r, i) => (isLegacyMediaRef(r) ? i : -1)).filter((i) => i >= 0)
  if (legacyIdx.length === 0) return out

  if (!hasAdminCredentials()) {
    for (const i of legacyIdx) out[i] = null
    return out
  }

  const paths = legacyIdx.map((i) => legacyMediaPath(refs[i] as string))
  try {
    const { data, error } = await createAdminClient().storage.from(LEGACY_MEDIA_BUCKET).createSignedUrls(paths, ttlSeconds)
    if (error || !data) {
      for (const i of legacyIdx) out[i] = null
      return out
    }
    legacyIdx.forEach((refIndex, k) => {
      const item = data[k]
      out[refIndex] = item && !item.error && item.signedUrl ? item.signedUrl : null
    })
  } catch {
    for (const i of legacyIdx) out[i] = null
  }
  return out
}

export async function resolveMediaUrl(ref: string | null | undefined, ttlSeconds?: number): Promise<string | null> {
  const [url] = await resolveMediaUrls([ref], ttlSeconds)
  return url ?? null
}

/** 객체 배열의 특정 필드를 해석된 URL 로 바꾼 새 배열을 돌려준다 (예: albums 의 cover_image_url) */
export async function withResolvedMedia<T extends Record<string, unknown>, K extends keyof T>(
  rows: T[],
  field: K,
  ttlSeconds?: number
): Promise<T[]> {
  const urls = await resolveMediaUrls(
    rows.map((r) => r[field] as string | null | undefined),
    ttlSeconds
  )
  return rows.map((r, i) => ({ ...r, [field]: urls[i] }))
}
