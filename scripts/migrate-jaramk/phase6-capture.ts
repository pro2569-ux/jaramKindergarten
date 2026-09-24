/**
 * Phase 6a. pageMaker 페이지 통짜 캡처 — 원본(jaramk.com) 페이지의 본문 컨테이너(#pageMakerBaseLayer)만
 * 헤드리스 크롬으로 2배율 캡처해 files/pagemaker-full/ 에 저장하고 manifest.json 을 만든다.
 *   node scripts/migrate-jaramk/phase6-capture.ts                 대상 전체(66 제외) 캡처. 이미 있는 pageCode 는 건너뜀
 *   node scripts/migrate-jaramk/phase6-capture.ts --codes 65,8    지정 pageCode 만
 *   node scripts/migrate-jaramk/phase6-capture.ts --force         이미 있어도 다시 캡처 (원본 부하를 생각해 꼭 필요할 때만)
 *
 * 원칙
 * - 원본 사이트 부하: 페이지 1건씩 순차, 페이지 사이 2초 대기, 실패해도 재시도하지 않음
 * - 캡처 영역: #pageMakerBaseLayer 의 박스(선언 width/height). 컨테이너 배경이 투명/흰색이면 아래쪽 빈 여백은
 *   자식 요소의 실제 바닥까지로 잘라낸다 (declaredHeight / cssHeight 를 manifest 에 둘 다 기록)
 * - 컨테이너를 못 찾으면 페이지 전체를 캡처하고 manifest.notes 에 남긴다
 * - 파생: <code>@1x.webp (CSS px 폭, q85), <code>@2x.webp (q80) — sharp
 *
 * 의존성: 크롬(chrome.exe), 루트 devDependency sharp. puppeteer 등은 쓰지 않는다 (design-audit/capture.mjs 의 CDP 코드 재사용).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { DATA_DIR } from './lib/paths.ts'

const ORIGIN = 'http://jaramk.com'
const PAGE_URL = (code: number) => `${ORIGIN}/main/sub.html?pageCode=${code}`
const OUT_DIR = join(DATA_DIR, 'files', 'pagemaker-full')
const MANIFEST = join(OUT_DIR, 'manifest.json')
const TRANSFORMED_PAGES = join(DATA_DIR, 'transformed', 'pages')

/** 캡처 대상. 66(교원/반편성)은 사이트에 이미 완성 이미지(/images/teacher.png)가 있어 캡처하지 않는다. */
const DEFAULT_CODES = [8, 10, 31, 32, 47, 52, 56, 57, 58, 60, 61, 62, 63, 65, 67]
const SKIP_CAPTURE = new Set([66])
const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 2 }
const CONTAINER_SELECTORS = ['#pageMakerBaseLayer', '#ContentBase', '.contents', '#contents', '#sub_contents']
const GAP_BETWEEN_PAGES_MS = 2000
const LOAD_TIMEOUT_MS = 45000
const IMAGE_WAIT_MS = 30000
const MAX_VIEWPORT_HEIGHT = 8000 // CSS px (2배율이면 16000px — 크롬 텍스처 한도 안)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const PORT = 9334

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const codesIdx = args.indexOf('--codes')
const CODES = codesIdx >= 0 && args[codesIdx + 1] ? args[codesIdx + 1]!.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)) : DEFAULT_CODES

const log = (m = '') => process.stdout.write(m + '\n')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`

export interface ManifestEntry {
  pageCode: number
  title: string
  slug: string
  sourceUrl: string
  capturedAt: string
  cssWidth: number
  cssHeight: number
  declaredWidth: number | null
  declaredHeight: number | null
  containerSelector: string | null
  files: Record<string, { path: string; bytes: number; width: number; height: number }>
  images: { total: number; broken: number }
  notes: string[]
  /** phase6-pagemaker-full.ts --upload 가 채움 */
  upload?: { variant: string; objectPath: string; publicUrl: string; bytes: number; uploadedAt: string }
}
export interface Manifest {
  generatedAt: string
  viewport: typeof VIEWPORT
  pages: ManifestEntry[]
}

type TPage = { pageCode: number; title: string; kind: string; proposed: { slug: string }; legacy_source_url: string }
function loadTransformed(code: number): TPage {
  const f = join(TRANSFORMED_PAGES, `${code}.json`)
  if (!existsSync(f)) throw new Error(`transformed/pages/${code}.json 없음`)
  return JSON.parse(readFileSync(f, 'utf8')) as TPage
}
function loadManifest(): Manifest {
  if (existsSync(MANIFEST)) return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest
  return { generatedAt: new Date().toISOString(), viewport: VIEWPORT, pages: [] }
}
function saveManifest(m: Manifest): void {
  m.generatedAt = new Date().toISOString()
  m.pages.sort((a, b) => a.pageCode - b.pageCode)
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2))
}

// ---------------------------------------------------------------------------
// Chrome 실행 (design-audit/capture.mjs 와 같은 방식)
// ---------------------------------------------------------------------------
function findChrome(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const c of candidates) if (existsSync(c)) return c
  throw new Error('chrome.exe 를 찾지 못했습니다.')
}

async function launchChrome(): Promise<{ proc: ChildProcess; userDataDir: string; wsUrl: string }> {
  const exe = findChrome()
  const userDataDir = mkdtempSync(join(tmpdir(), 'pagemaker-full-chrome-'))
  const flags = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--hide-scrollbars',
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--mute-audio',
    '--lang=ko-KR',
    'about:blank',
  ]
  const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  proc.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString()
    if (stderr.length > 20000) stderr = stderr.slice(-10000)
  })
  const deadline = Date.now() + 20000
  type Version = { Browser: string; webSocketDebuggerUrl: string }
  let version: Version | null = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) {
        version = (await res.json()) as Version
        break
      }
    } catch {
      /* 아직 안 뜸 */
    }
    if (proc.exitCode !== null) throw new Error(`Chrome 이 바로 종료됨 (code ${proc.exitCode})\n${stderr}`)
    await sleep(250)
  }
  if (!version) throw new Error(`Chrome DevTools 포트(${PORT}) 응답 없음\n${stderr}`)
  log(`[chrome] ${version.Browser}`)
  return { proc, userDataDir, wsUrl: version.webSocketDebuggerUrl }
}

// ---------------------------------------------------------------------------
// 최소 CDP 클라이언트
// ---------------------------------------------------------------------------
type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; method: string }
class CDP {
  private ws!: WebSocket
  private id = 0
  private pending = new Map<number, Pending>()
  private listeners = new Map<string, Set<(p: unknown) => void>>()
  private wsUrl: string
  constructor(wsUrl: string) {
    this.wsUrl = wsUrl
  }
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      this.ws = ws
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('WebSocket 오류')))
      ws.addEventListener('message', (ev) => this.onMessage(String(ev.data)))
      ws.addEventListener('close', () => {
        for (const [, p] of this.pending) p.reject(new Error('WebSocket 닫힘'))
        this.pending.clear()
      })
    })
  }
  private onMessage(raw: string): void {
    let msg: { id?: number; method?: string; sessionId?: string; params?: unknown; result?: unknown; error?: { message: string; data?: string } }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}${msg.error.data ? ' ' + msg.error.data : ''}`))
      else p.resolve(msg.result)
      return
    }
    if (msg.method) {
      const set = this.listeners.get(`${msg.sessionId ?? ''}|${msg.method}`)
      if (set) for (const fn of [...set]) fn(msg.params)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send<T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const id = ++this.id
    const payload: Record<string, unknown> = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, method })
      this.ws.send(JSON.stringify(payload))
    })
  }
  on(sessionId: string | undefined, method: string, fn: (p: unknown) => void): () => void {
    const key = `${sessionId ?? ''}|${method}`
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key)!.add(fn)
    return () => this.listeners.get(key)?.delete(fn)
  }
  once(sessionId: string | undefined, method: string, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const off = this.on(sessionId, method, (p) => {
        off()
        clearTimeout(t)
        resolve(p)
      })
      const t = setTimeout(() => {
        off()
        reject(new Error(`${method} 대기 시간 초과 (${timeoutMs}ms)`))
      }, timeoutMs)
    })
  }
  close(): void {
    try {
      this.ws?.close()
    } catch {
      /* noop */
    }
  }
}

async function evaluate<T>(cdp: CDP, sessionId: string, expression: string): Promise<T> {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)
  if (r.exceptionDetails) throw new Error(`페이지 스크립트 오류: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result?.value as T
}

// ---------------------------------------------------------------------------
// 컨테이너 측정 스크립트 (페이지 안에서 실행)
// ---------------------------------------------------------------------------
interface Measure {
  selector: string | null
  x: number
  y: number
  width: number
  height: number
  declaredWidth: number | null
  declaredHeight: number | null
  contentBottom: number | null // 컨테이너 상단 기준 자식들의 실제 바닥
  background: { color: string; image: string }
  images: { total: number; broken: number }
  scrollHeight: number
}
const MEASURE_JS = `(() => {
  const sels = ${JSON.stringify(CONTAINER_SELECTORS)};
  window.scrollTo(0, 0);
  const px = (s, prop) => { const m = new RegExp('(?:^|;)\\\\s*' + prop + '\\\\s*:\\\\s*(-?\\\\d+(?:\\\\.\\\\d+)?)px', 'i').exec(s || ''); return m ? Number(m[1]) : null; };
  const imgsIn = (root) => { const im = Array.from(root.querySelectorAll('img')); return { total: im.length, broken: im.filter((i) => i.complete && i.naturalWidth === 0).length }; };
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 20) continue;
    let contentBottom = null;
    for (const c of Array.from(el.children)) {
      const cr = c.getBoundingClientRect();
      if (cr.width === 0 && cr.height === 0) continue;
      const b = cr.bottom - r.top;
      if (contentBottom === null || b > contentBottom) contentBottom = b;
    }
    const cs = getComputedStyle(el);
    const st = el.getAttribute('style');
    return {
      selector: sel,
      x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height,
      declaredWidth: px(st, 'width'), declaredHeight: px(st, 'height'),
      contentBottom,
      background: { color: cs.backgroundColor, image: cs.backgroundImage },
      images: imgsIn(el),
      scrollHeight: document.documentElement.scrollHeight,
    };
  }
  return {
    selector: null, x: 0, y: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    declaredWidth: null, declaredHeight: null, contentBottom: null,
    background: { color: '', image: '' }, images: imgsIn(document), scrollHeight: document.documentElement.scrollHeight,
  };
})()`

// ---------------------------------------------------------------------------
// 캡처 1건
// ---------------------------------------------------------------------------
async function capture(cdp: CDP, code: number, meta: TPage): Promise<ManifestEntry> {
  const url = PAGE_URL(code)
  const notes: string[] = []
  const started = Date.now()
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  try {
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: UA, acceptLanguage: 'ko-KR,ko' }, sessionId)
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, mobile: false }, sessionId)

    const loadP = cdp.once(sessionId, 'Page.loadEventFired', LOAD_TIMEOUT_MS)
    loadP.catch(() => {})
    const nav = await Promise.race([cdp.send('Page.navigate', { url }, sessionId), loadP.then(() => ({}))])
    if (nav && nav.errorText) throw new Error(`이동 실패: ${nav.errorText}`)
    await loadP
    const loadMs = Date.now() - started

    // 이미지 로드 대기 (pageMaker 조각이 50~90장이라 넉넉히)
    const imgDeadline = Date.now() + IMAGE_WAIT_MS
    let pending = -1
    while (Date.now() < imgDeadline) {
      pending = await evaluate<number>(cdp, sessionId, 'Array.from(document.images).filter((i) => !i.complete).length')
      if (pending === 0) break
      await sleep(300)
    }
    if (pending !== 0) notes.push(`이미지 ${pending}장이 ${IMAGE_WAIT_MS}ms 안에 로드되지 않음`)
    await sleep(800)

    const m = await evaluate<Measure>(cdp, sessionId, MEASURE_JS)
    if (!m.selector) notes.push('본문 컨테이너를 찾지 못해 페이지 전체를 캡처함')
    if (m.images.broken > 0) notes.push(`컨테이너 안 깨진 이미지 ${m.images.broken}장`)

    // 아래쪽 빈 여백 잘라내기: 배경이 투명/흰색이고 자식 바닥이 선언 높이보다 위에 있을 때만
    let height = m.height
    const bgPlain = !m.background.image || m.background.image === 'none'
    const bgColorPlain = /^(rgba\(0, 0, 0, 0\)|transparent|rgb\(255, 255, 255\))$/.test(m.background.color)
    if (m.selector && m.contentBottom !== null && bgPlain && bgColorPlain && m.contentBottom + 10 < m.height) {
      height = Math.ceil(m.contentBottom + 10)
      notes.push(`아래 빈 여백 제거: 선언 ${Math.round(m.height)}px → ${height}px`)
    }
    const clip = { x: Math.floor(m.x), y: Math.floor(m.y), width: Math.ceil(m.width), height: Math.ceil(height), scale: 1 }

    // 뷰포트를 클립 바닥까지 늘린 뒤 captureBeyondViewport 로 캡처
    const vpHeight = Math.min(MAX_VIEWPORT_HEIGHT, Math.max(VIEWPORT.height, clip.y + clip.height + 50))
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, height: vpHeight, mobile: false }, sessionId)
    await sleep(500)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true }, sessionId)
    const png = Buffer.from(shot.data, 'base64')
    const pngPath = join(OUT_DIR, `${code}.png`)
    writeFileSync(pngPath, png)

    // 파생 webp
    const src = sharp(png)
    const info = await src.metadata()
    const cssWidth = clip.width
    const cssHeight = clip.height
    const p1 = join(OUT_DIR, `${code}@1x.webp`)
    const p2 = join(OUT_DIR, `${code}@2x.webp`)
    await sharp(png).resize({ width: cssWidth }).webp({ quality: 85 }).toFile(p1)
    await sharp(png).webp({ quality: 80 }).toFile(p2)
    const m1 = await sharp(p1).metadata()
    const m2 = await sharp(p2).metadata()
    const files: ManifestEntry['files'] = {
      png: { path: `files/pagemaker-full/${code}.png`, bytes: png.length, width: info.width ?? 0, height: info.height ?? 0 },
      '1x': { path: `files/pagemaker-full/${code}@1x.webp`, bytes: statSync(p1).size, width: m1.width ?? 0, height: m1.height ?? 0 },
      '2x': { path: `files/pagemaker-full/${code}@2x.webp`, bytes: statSync(p2).size, width: m2.width ?? 0, height: m2.height ?? 0 },
    }
    log(
      `  ${code} ${meta.title}: ${m.selector ?? '(전체)'} ${cssWidth}x${cssHeight}css → png ${info.width}x${info.height} ${kb(png.length)} | 1x ${kb(files['1x']!.bytes)} | 2x ${kb(files['2x']!.bytes)} | 이미지 ${m.images.total}장(깨짐 ${m.images.broken}) | load ${loadMs}ms, 총 ${Date.now() - started}ms${notes.length ? ' | ' + notes.join('; ') : ''}`,
    )
    return {
      pageCode: code,
      title: meta.title,
      slug: meta.proposed.slug,
      sourceUrl: url,
      capturedAt: new Date().toISOString(),
      cssWidth,
      cssHeight,
      declaredWidth: m.declaredWidth,
      declaredHeight: m.declaredHeight,
      containerSelector: m.selector,
      files,
      images: m.images,
      notes,
    }
  } finally {
    try {
      await cdp.send('Target.closeTarget', { targetId })
    } catch {
      /* noop */
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })
  const manifest = loadManifest()
  const todo = CODES.filter((c) => {
    if (SKIP_CAPTURE.has(c)) {
      log(`  ${c}: 캡처 제외 (사이트의 /images/teacher.png 재사용)`)
      return false
    }
    if (!FORCE && manifest.pages.some((p) => p.pageCode === c)) {
      log(`  ${c}: 이미 캡처됨 → 건너뜀 (--force 로 다시)`)
      return false
    }
    return true
  })
  if (todo.length === 0) {
    log('캡처할 페이지가 없습니다.')
    return
  }
  log(`캡처 대상 ${todo.length}건: ${todo.join(', ')} → ${OUT_DIR}`)

  const chrome = await launchChrome()
  const cdp = new CDP(chrome.wsUrl)
  await cdp.connect()
  let ok = 0
  let failed = 0
  try {
    for (const [i, code] of todo.entries()) {
      const meta = loadTransformed(code)
      if (meta.kind !== 'pagemaker') log(`  ${code}: kind=${meta.kind} (pagemaker 아님) — 그래도 캡처`)
      try {
        const entry = await capture(cdp, code, meta)
        manifest.pages = manifest.pages.filter((p) => p.pageCode !== code)
        manifest.pages.push(entry)
        saveManifest(manifest)
        ok++
      } catch (e) {
        failed++
        log(`  ${code} 실패 (재시도 안 함): ${e instanceof Error ? e.message : e}`)
      }
      if (i < todo.length - 1) await sleep(GAP_BETWEEN_PAGES_MS)
    }
  } finally {
    cdp.close()
    if (chrome.proc.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(chrome.proc.pid), '/T', '/F'], { stdio: 'ignore' })
      else chrome.proc.kill('SIGKILL')
    }
    for (let i = 0; i < 20 && chrome.proc.exitCode === null; i++) await sleep(100)
    await sleep(300)
    for (let i = 0; i < 5; i++) {
      try {
        rmSync(chrome.userDataDir, { recursive: true, force: true })
        break
      } catch {
        await sleep(500)
      }
    }
  }
  log(`완료: 성공 ${ok}, 실패 ${failed} → ${MANIFEST}`)
  process.exitCode = failed > 0 ? 1 : 0
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
