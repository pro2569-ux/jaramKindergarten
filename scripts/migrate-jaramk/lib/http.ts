/**
 * jaramk.com 전용 HTTP 클라이언트.
 *
 * 원칙 (모든 Phase 공통):
 * - GET 만 보낸다. 다른 메서드는 아예 구현하지 않는다.
 * - 동시 요청 1개 (모듈 전역 throttle). 간격: 페이지 1.5초, 파일 다운로드 0.5초.
 * - 실패 시 최대 3회 재시도, 간격 3s → 6s → 12s.
 * - 성공 응답은 data/raw 에 캐시하고, 다음 실행부터는 네트워크 없이 캐시를 쓴다 (이어받기).
 *   파일 다운로드(downloadTo)는 raw 캐시 대신 목적지 파일 존재 여부로 이어받기.
 * - 로그인 쿠키(.env.local)는 Cookie 헤더로 보내되 값은 절대 로그에 남기지 않는다.
 * - 로그인 벽(권한 없음 경고/로그인 iframe)은 loginWall 로 표시하고 캐시하지 않는다.
 */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DATA_DIR, RAW_DIR, ensureDirs } from './paths.ts'

export const BASE_URL = 'http://jaramk.com'
const PAGE_INTERVAL_MS = 1500
const FILE_INTERVAL_MS = 500
const MAX_RETRIES = 3
const RETRY_BASE_MS = 3000
const TIMEOUT_MS = 60000
const USER_AGENT = 'Mozilla/5.0 (compatible; jaram-migration/0.1; site-owner content migration)'

export type RequestKind = 'page' | 'file'

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
  lastModified: string | null
  bytes: number
  fetchedAt: string
  /** HTML 응답이 로그인 벽(권한 없음 경고/로그인 iframe)이면 그 사유. 쿠키 사용 중이면 세션 만료 의심 */
  loginWall: string | null
  body: Buffer
  fromCache: boolean
}

type Meta = Omit<RawResponse, 'body' | 'fromCache'>

export interface HtmlResponse extends RawResponse {
  html: string
  charset: string
}

export interface DownloadResult {
  url: string
  dest: string
  status: number
  bytes: number
  contentType: string | null
  lastModified: string | null
  fromCache: boolean
  ok: boolean
  reason: string | null
}

export const stats = { network: 0, cached: 0, failed: 0, loginWalls: 0, bytes: 0 }

let lastRequestAt = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttle(kind: RequestKind): Promise<void> {
  const interval = kind === 'file' ? FILE_INTERVAL_MS : PAGE_INTERVAL_MS
  const wait = lastRequestAt + interval - Date.now()
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

/**
 * 로그인 세션 쿠키 헤더. .env.local 의 JARAMK_COOKIE("PHPSESSID=..; ANYSELITEDEL=Y") 를 우선 쓰고,
 * 없으면 개별 변수 PHPSESSID / ANYSELITEDEL 로 조립한다. 값은 절대 로그에 남기지 않는다.
 */
export function cookieHeader(): string | null {
  const direct = process.env.JARAMK_COOKIE?.trim()
  if (direct) return direct
  const parts: string[] = []
  if (process.env.PHPSESSID) parts.push(`PHPSESSID=${process.env.PHPSESSID.trim()}`)
  if (process.env.ANYSELITEDEL) parts.push(`ANYSELITEDEL=${process.env.ANYSELITEDEL.trim()}`)
  return parts.length ? parts.join('; ') : null
}

export function hasSessionCookie(): boolean {
  return cookieHeader() !== null
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
  }
  const cookie = cookieHeader()
  if (cookie) headers.Cookie = cookie
  return headers
}

/**
 * 로그인 필요/세션 만료 페이지로 보이는지.
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

/** Phase 1 수집용: 쿠키를 쓰는 중에 로그인 벽을 만나면 즉시 중단 */
export function assertSession(res: { url: string; loginWall: string | null }): void {
  if (res.loginWall && hasSessionCookie()) throw new SessionExpiredError(res.url, res.loginWall)
}

interface FetchAttempt {
  status: number
  finalUrl: string
  contentType: string | null
  lastModified: string | null
  body: Buffer
}

/** 재시도 포함 GET. 5xx/429/네트워크 오류만 재시도, 4xx 는 그대로 반환. */
async function getWithRetry(abs: string, kind: RequestKind): Promise<FetchAttempt> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const backoff = RETRY_BASE_MS * 2 ** (attempt - 1)
      log(`재시도 ${attempt}/${MAX_RETRIES} (${backoff / 1000}s 후): ${abs}`)
      await sleep(backoff)
    }
    await throttle(kind)
    try {
      const res = await fetch(abs, {
        method: 'GET',
        headers: requestHeaders(),
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const body = Buffer.from(await res.arrayBuffer())
      stats.network += 1
      stats.bytes += body.byteLength
      if (res.status >= 500 || res.status === 429) {
        lastError = new Error(`HTTP ${res.status}`)
        continue
      }
      return {
        status: res.status,
        finalUrl: res.url || abs,
        contentType: res.headers.get('content-type'),
        lastModified: res.headers.get('last-modified'),
        body,
      }
    } catch (err) {
      lastError = err
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`요청 실패 (재시도 ${MAX_RETRIES}회 소진): ${abs} — ${reason}`)
}

/**
 * GET + raw 캐시. 2xx 만 캐시하고, 그 외는 failures.jsonl 에 기록한다.
 * 상대 URL 은 BASE_URL 기준으로 절대화한다.
 */
export async function fetchRaw(url: string, opts: { force?: boolean; kind?: RequestKind } = {}): Promise<RawResponse> {
  ensureDirs()
  const abs = absoluteUrl(url)
  const key = cacheKey(abs)
  const metaPath = join(RAW_DIR, `${key}.json`)
  const bodyPath = join(RAW_DIR, `${key}.bin`)
  const kind = opts.kind ?? 'page'

  if (!opts.force && existsSync(metaPath) && existsSync(bodyPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Partial<Meta> & Meta
    const cachedBody = readFileSync(bodyPath)
    const cachedWall =
      meta.loginWall ??
      (meta.contentType?.includes('text/html')
        ? looksLikeLoginWall(meta.finalUrl, decodeHtml(cachedBody, meta.contentType).text)
        : null)
    // 쿠키 없이 받아 둔 로그인 벽 페이지는, 쿠키가 생겼으면 다시 받는다
    if (!(cachedWall && hasSessionCookie())) {
      stats.cached += 1
      return { ...meta, lastModified: meta.lastModified ?? null, loginWall: cachedWall, body: cachedBody, fromCache: true }
    }
    log(`캐시 무효화(로그인 벽 → 쿠키로 재요청): ${abs}`)
  }

  let attempt: FetchAttempt
  try {
    attempt = await getWithRetry(abs, kind)
  } catch (err) {
    recordFailure(abs, err instanceof Error ? err.message : String(err))
    throw err
  }

  const { status, finalUrl, contentType, lastModified, body } = attempt
  const loginWall = contentType?.includes('text/html') ? looksLikeLoginWall(finalUrl, decodeHtml(body, contentType).text) : null
  const result: RawResponse = {
    url: abs,
    finalUrl,
    status,
    contentType,
    lastModified,
    bytes: body.byteLength,
    fetchedAt: new Date().toISOString(),
    loginWall,
    body,
    fromCache: false,
  }

  if (loginWall && hasSessionCookie()) {
    // 쿠키를 보냈는데도 로그인 벽 → 세션 만료 또는 권한 부족. 캐시하지 않고 호출자가 판단하게 한다.
    stats.loginWalls += 1
    log(`⚠ 로그인 벽 (${loginWall}): ${abs}`)
    return result
  }

  if (status >= 200 && status < 300) {
    const meta: Meta = {
      url: result.url,
      finalUrl: result.finalUrl,
      status: result.status,
      contentType: result.contentType,
      lastModified: result.lastModified,
      bytes: result.bytes,
      fetchedAt: result.fetchedAt,
      loginWall,
    }
    writeFileSync(bodyPath, body)
    writeFileSync(metaPath, JSON.stringify(meta, null, 2))
    appendFileSync(join(RAW_DIR, 'index.jsonl'), JSON.stringify({ key, ...meta }) + '\n')
  } else {
    recordFailure(abs, `HTTP ${status}`)
  }
  return result
}

/**
 * 파일 다운로드 (이미지/첨부). 목적지 파일이 이미 있으면(0바이트 초과) 네트워크 없이 그대로 사용.
 * HTML 이 돌아오면(권한 없음/오류 페이지) 실패로 기록하고, 쿠키 사용 중 로그인 벽이면 SessionExpiredError.
 */
export async function downloadTo(url: string, dest: string): Promise<DownloadResult> {
  ensureDirs()
  const abs = absoluteUrl(url)
  if (existsSync(dest)) {
    const size = statSync(dest).size
    if (size > 0) {
      stats.cached += 1
      return { url: abs, dest, status: 200, bytes: size, contentType: null, lastModified: null, fromCache: true, ok: true, reason: null }
    }
  }

  let attempt: FetchAttempt
  try {
    attempt = await getWithRetry(abs, 'file')
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    recordFailure(abs, reason)
    return { url: abs, dest, status: 0, bytes: 0, contentType: null, lastModified: null, fromCache: false, ok: false, reason }
  }

  const { status, finalUrl, contentType, lastModified, body } = attempt
  const base = { url: abs, dest, status, contentType, lastModified, fromCache: false }

  if (contentType?.includes('text/html')) {
    const html = decodeHtml(body, contentType).text
    const wall = looksLikeLoginWall(finalUrl, html)
    if (wall && hasSessionCookie()) {
      stats.loginWalls += 1
      throw new SessionExpiredError(abs, wall)
    }
    const reason = `파일 대신 HTML 응답 (HTTP ${status})`
    recordFailure(abs, reason)
    return { ...base, bytes: 0, ok: false, reason }
  }
  if (status < 200 || status >= 300 || body.byteLength === 0) {
    const reason = body.byteLength === 0 ? `빈 응답 (HTTP ${status})` : `HTTP ${status}`
    recordFailure(abs, reason)
    return { ...base, bytes: 0, ok: false, reason }
  }

  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, body)
  return { ...base, bytes: body.byteLength, ok: true, reason: null }
}

function recordFailure(url: string, reason: string): void {
  stats.failed += 1
  appendFileSync(join(DATA_DIR, 'failures.jsonl'), JSON.stringify({ url, reason, at: new Date().toISOString() }) + '\n')
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
