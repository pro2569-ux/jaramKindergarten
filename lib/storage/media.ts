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
 *
 * 실패는 null 로 내려가 플레이스홀더가 뜨지만, 원인은 반드시 서버 로그(console.error)에 남긴다. 키 값은 절대 기록하지 않는다.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60
/** Storage 일괄 서명 요청을 나누는 단위 (요청 본문 크기·API 제한 여유) */
const SIGN_BATCH_SIZE = 100

export function isLegacyMediaRef(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(LEGACY_MEDIA_PREFIX)
}

export function legacyMediaPath(ref: string): string {
  return ref.slice(LEGACY_MEDIA_PREFIX.length).replace(/^\/+/, '')
}

function logMediaError(context: string, detail: unknown): void {
  const message = detail instanceof Error ? detail.message : typeof detail === 'string' ? detail : JSON.stringify(detail)
  console.error(`[legacy-media] ${context}: ${message}`)
}

/**
 * 여러 참조를 한 번에 해석한다. legacy 참조만 모아 100개씩 서명하고, 실패한 항목은 null.
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
    logMediaError('서명 불가', 'SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수가 서버 런타임에 없음')
    for (const i of legacyIdx) out[i] = null
    return out
  }

  for (let start = 0; start < legacyIdx.length; start += SIGN_BATCH_SIZE) {
    const batch = legacyIdx.slice(start, start + SIGN_BATCH_SIZE)
    const paths = batch.map((i) => legacyMediaPath(refs[i] as string))
    try {
      const { data, error } = await createAdminClient().storage.from(LEGACY_MEDIA_BUCKET).createSignedUrls(paths, ttlSeconds)
      if (error || !data) {
        logMediaError(`createSignedUrls 실패 (${paths.length}개)`, error ?? 'no data')
        for (const i of batch) out[i] = null
        continue
      }
      let itemErrors = 0
      batch.forEach((refIndex, k) => {
        const item = data[k]
        if (item && !item.error && item.signedUrl) out[refIndex] = item.signedUrl
        else {
          out[refIndex] = null
          itemErrors += 1
          if (itemErrors <= 3) logMediaError(`서명 항목 실패 ${paths[k]}`, item?.error ?? 'no signedUrl')
        }
      })
      if (itemErrors > 3) logMediaError('서명 항목 실패', `외 ${itemErrors - 3}건`)
    } catch (err) {
      logMediaError(`createSignedUrls 예외 (${paths.length}개)`, err)
      for (const i of batch) out[i] = null
    }
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

export interface LegacyMediaDiagnostics {
  env: {
    hasSupabaseUrl: boolean
    hasServiceRoleKey: boolean
    /** 키 값은 절대 포함하지 않음. 형태만: legacy-jwt(eyJ…) | sb_secret | other */
    serviceRoleKeyType: 'legacy-jwt' | 'sb_secret' | 'other' | null
    serviceRoleKeyLength: number
    serviceRoleKeyHasWhitespace: boolean
  }
  bucket: { name: string; reachable: boolean; error: string | null }
  sign: { path: string | null; ok: boolean; error: string | null; fetchStatus: number | null }
}

/**
 * 관리자 진단용: 환경변수 존재 여부(값 제외), 버킷 접근, 서명 1건 + 실제 GET 결과를 돌려준다.
 */
export async function diagnoseLegacyMedia(samplePath: string | null): Promise<LegacyMediaDiagnostics> {
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const key = rawKey.trim()
  const env: LegacyMediaDiagnostics['env'] = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: key.length > 0,
    serviceRoleKeyType: key ? (key.startsWith('eyJ') ? 'legacy-jwt' : key.startsWith('sb_secret') ? 'sb_secret' : 'other') : null,
    serviceRoleKeyLength: key.length,
    serviceRoleKeyHasWhitespace: rawKey !== key,
  }
  const bucket: LegacyMediaDiagnostics['bucket'] = { name: LEGACY_MEDIA_BUCKET, reachable: false, error: null }
  const sign: LegacyMediaDiagnostics['sign'] = { path: samplePath, ok: false, error: null, fetchStatus: null }
  if (!hasAdminCredentials()) {
    bucket.error = '환경변수 없음'
    sign.error = '환경변수 없음'
    return { env, bucket, sign }
  }
  try {
    const { error } = await createAdminClient().storage.getBucket(LEGACY_MEDIA_BUCKET)
    bucket.reachable = !error
    bucket.error = error?.message ?? null
  } catch (err) {
    bucket.error = err instanceof Error ? err.message : String(err)
  }
  if (samplePath) {
    try {
      const { data, error } = await createAdminClient().storage.from(LEGACY_MEDIA_BUCKET).createSignedUrl(samplePath, 60)
      if (error || !data?.signedUrl) sign.error = error?.message ?? 'no signedUrl'
      else {
        const res = await fetch(data.signedUrl, { method: 'GET' })
        sign.fetchStatus = res.status
        sign.ok = res.ok
        if (!res.ok) sign.error = `GET ${res.status}`
      }
    } catch (err) {
      sign.error = err instanceof Error ? err.message : String(err)
    }
  }
  return { env, bucket, sign }
}
