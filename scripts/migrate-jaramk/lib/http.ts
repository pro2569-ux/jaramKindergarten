/**
 * jaramk.com 전용 HTTP 클라이언트.
 *
 * 원칙 (모든 Phase 공통):
 * - GET 만 보낸다. 다른 메서드는 아예 구현하지 않는다.
 * - 요청 간격 최소 1.5초, 동시 요청 1개 (모듈 전역 throttle).
 * - 실패 시 최대 3회 재시도, 간격 3s → 6s → 12s.
 * - 성공 응답은 data/raw 에 캐시하고, 다음 실행부터는 네트워크 없이 캐시를 쓴다 (이어받기).
 * - JARAMK_COOKIE(.env.local) 가 있으면 Cookie 헤더로 보내되 값은 절대 로그에 남기지 않는다.
 * - 로그인 페이지로 튕기는 등 세션 만료 징후가 보이면 SessionExpiredError 로 즉시 중단.
 */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, RAW_DIR, ensureDirs } from './paths.ts'

export const BASE_URL = 'http://jaramk.com'
const MIN_INTERVAL_MS = 1500
const MAX_RETRIES = 3
const RETRY_BASE_MS = 3000
const TIMEOUT_MS = 30000
const USER_AGENT = 'Mozilla/5.0 (compatible; jaram-migration/0.1; site-owner content migration)'

export class SessionExpiredError extends Error {
  constructor(url: string, reason: string) {
    super(`세션 만료 감지 (${reason}): ${url}`)
    this.name = 'SessionExpiredError'
  }
}

export interface RawResponse {
  url: string
  finalUrl: string
  status: number
  contentType: string | null
  bytes: number
  fetchedAt: string
  body: Buffer
  fromCache: boolean
}

type Meta = Omit<RawResponse, 'body' | 'fromCache'>

export interface HtmlResponse extends RawResponse {
  html: string
  charset: string
}

export const stats = { network: 0, cached: 0, failed: 0 }

let lastRequestAt = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
}

export function log(message: string): void {
  process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] ${message}\n`)
}

export function absoluteUrl(url: string, base: string = BASE_URL): string {
  return new URL(url, base).toString()
}

function cacheKey(url: string): string {
  return createHash('sha1').update(url).digest('hex')
}

export function isCached(url: string): boolean {
  const key = cacheKey(absoluteUrl(url))
  return existsSync(join(RAW_DIR, `${key}.json`)) && existsSync(join(RAW_DIR, `${key}.bin`))
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
  }
  const cookie = process.env.JARAMK_COOKIE
  if (cookie) headers.Cookie = cookie
  return headers
}

/**
 * 로그인 필요/세션 만료 페이지로 보이는지 (쿠키를 쓰는 상황에서만 호출됨).
 * 실제 사이트 마크업 기준:
 *  - window.alert("리스트보기 권한이 없습니다.") / ("글보기 권한이 없습니다.") + onload 로그인 팝업
 *  - <iframe src="/core/module/membership/default/loginPage.html">
 * 헤더의 로그인 버튼에도 membership.html?Mode=login 이 있으므로 그 문자열만으로 판정하지 않는다.
 */
export function looksLikeLoginWall(finalUrl: string, html: string): string | null {
  if (/membership\.html\?[^"']*Mode=login/i.test(finalUrl)) return 'login URL로 리다이렉트'
  const alert = /window\.alert\(["']([^"']*권한이 없습니다[^"']*)["']\)/.exec(html)
  if (alert) return alert[1] ?? '권한 없음 경고'
  if (/<iframe[^>]+src=["'][^"']*membership\/default\/loginPage\.html/i.test(html)) return '로그인 iframe'
  if (/onload\s*=\s*function\s*\(\)\s*\{\s*openPage\.createPage\([^)]*membership\.html\?Mode=login/.test(html)) {
    return 'onload 로그인 팝업'
  }
  return null
}

/**
 * GET + 캐시 + 재시도. 2xx 만 캐시하고, 그 외는 failures.jsonl 에 기록한다.
 * 상대 URL 은 BASE_URL 기준으로 절대화한다.
 */
export async function fetchRaw(url: string, opts: { force?: boolean } = {}): Promise<RawResponse> {
  ensureDirs()
  const abs = absoluteUrl(url)
  const key = cacheKey(abs)
  const metaPath = join(RAW_DIR, `${key}.json`)
  const bodyPath = join(RAW_DIR, `${key}.bin`)

  if (!opts.force && existsSync(metaPath) && existsSync(bodyPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Meta
    stats.cached += 1
    return { ...meta, body: readFileSync(bodyPath), fromCache: true }
  }

  let lastError: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const backoff = RETRY_BASE_MS * 2 ** (attempt - 1)
      log(`재시도 ${attempt}/${MAX_RETRIES} (${backoff / 1000}s 후): ${abs}`)
      await sleep(backoff)
    }
    await throttle()
    try {
      const res = await fetch(abs, {
        method: 'GET',
        headers: requestHeaders(),
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const body = Buffer.from(await res.arrayBuffer())
      stats.network += 1

      if (res.status >= 500 || res.status === 429) {
        lastError = new Error(`HTTP ${res.status}`)
        continue
      }

      const result: RawResponse = {
        url: abs,
        finalUrl: res.url || abs,
        status: res.status,
        contentType: res.headers.get('content-type'),
        bytes: body.byteLength,
        fetchedAt: new Date().toISOString(),
        body,
        fromCache: false,
      }

      if (process.env.JARAMK_COOKIE && result.contentType?.includes('text/html')) {
        const reason = looksLikeLoginWall(result.finalUrl, decodeHtml(body, result.contentType).text)
        if (reason) throw new SessionExpiredError(abs, reason)
      }

      if (res.ok) {
        const meta: Meta = {
          url: result.url,
          finalUrl: result.finalUrl,
          status: result.status,
          contentType: result.contentType,
          bytes: result.bytes,
          fetchedAt: result.fetchedAt,
        }
        writeFileSync(bodyPath, body)
        writeFileSync(metaPath, JSON.stringify(meta, null, 2))
        appendFileSync(join(RAW_DIR, 'index.jsonl'), JSON.stringify({ key, ...meta }) + '\n')
      } else {
        recordFailure(abs, `HTTP ${res.status}`)
      }
      return result
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err
      lastError = err
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError)
  recordFailure(abs, reason)
  throw new Error(`요청 실패 (재시도 ${MAX_RETRIES}회 소진): ${abs} — ${reason}`)
}

function recordFailure(url: string, reason: string): void {
  stats.failed += 1
  appendFileSync(
    join(DATA_DIR, 'failures.jsonl'),
    JSON.stringify({ url, reason, at: new Date().toISOString() }) + '\n'
  )
}

/**
 * 문자 인코딩 감지 후 디코드.
 * 우선순위: Content-Type 헤더 charset → <meta charset> → UTF-8 엄격 디코드 시도 → 실패 시 EUC-KR.
 */
export function decodeHtml(body: Buffer, contentType: string | null): { text: string; charset: string } {
  const headerCharset = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]?.toLowerCase()
  const sniff = body.subarray(0, 4096).toString('latin1')
  const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1]?.toLowerCase()
  const declared = headerCharset ?? metaCharset

  const isKorean = (cs?: string) => !!cs && /euc-kr|ks_c_5601|cp949|x-windows-949/.test(cs)
  if (isKorean(declared)) {
    return { text: new TextDecoder('euc-kr').decode(body), charset: 'euc-kr' }
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(body), charset: 'utf-8' }
  } catch {
    // UTF-8 로 선언됐지만 실제 바이트가 깨진 경우 (오래된 EUC-KR 글)
    return { text: new TextDecoder('euc-kr').decode(body), charset: 'euc-kr(fallback)' }
  }
}

export async function fetchHtml(url: string, opts: { force?: boolean } = {}): Promise<HtmlResponse> {
  const raw = await fetchRaw(url, opts)
  const { text, charset } = decodeHtml(raw.body, raw.contentType)
  return { ...raw, html: text, charset }
}

/** 폰트 이미지 URL(/core/fonts/text.html?...&text=<base64>) 에서 라벨 복원 */
export function decodeFontImageLabel(src: string): string | null {
  const m = /[?&]text=([^&"']+)/.exec(src)
  if (!m?.[1]) return null
  try {
    const b64 = decodeURIComponent(m[1]).replace(/ /g, '+')
    return Buffer.from(b64, 'base64').toString('utf8').trim()
  } catch {
    return null
  }
}
