#!/usr/bin/env node
/**
 * 디자인 감사용 스크린샷·지표 수집기 (의존성 없음, Node 24+).
 *
 * 헤드리스 크롬을 자식 프로세스로 띄우고 DevTools Protocol(WebSocket) 로 직접 제어한다.
 * puppeteer/playwright 를 설치하지 않으며, 브라우저를 내려받지도 않는다.
 *
 * 사용:
 *   node scripts/design-audit/capture.mjs --base https://jaramk.vercel.app \
 *     --out scripts/design-audit/screenshots --pages scripts/design-audit/pages.production.json
 *
 * 옵션:
 *   --base <url>           기준 URL (기본 http://127.0.0.1:3000)
 *   --out <dir>            출력 폴더 (기본 scripts/design-audit/screenshots)
 *   --pages <file.json>    페이지 목록 [{ path, name?, viewports?, actions? }]
 *   --prefix <str>         파일명 접두어 (예: local_)
 *   --viewports pc,mobile  기본 둘 다
 *   --load-timeout <ms>    load 이벤트 대기 한도 (기본 30000)
 *   --port <n>             원격 디버깅 포트 (기본 9333)
 *   --chrome <exe>         chrome.exe 경로 강제
 *
 * 출력:
 *   <out>/<prefix><viewport>_<slug>.png
 *   <out>/metrics.json   (페이지별 지표 배열; 같은 file 키는 덮어씀)
 *   <out>/index.json     (파일·크기·소요시간·오류)
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
function opt(name, def) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const BASE = (opt('base', 'http://127.0.0.1:3000')).replace(/\/+$/, '')
const OUT = path.resolve(opt('out', 'scripts/design-audit/screenshots'))
const PAGES_FILE = opt('pages', null)
const PREFIX = opt('prefix', '')
const VIEWPORT_NAMES = opt('viewports', 'pc,mobile').split(',').map((s) => s.trim()).filter(Boolean)
const LOAD_TIMEOUT = Number(opt('load-timeout', 30000))
const PORT = Number(opt('port', 9333))
const CHROME_OPT = opt('chrome', null)

const VIEWPORTS = {
  pc: { name: 'pc', width: 1440, height: 900, mobile: false },
  mobile: { name: 'mobile', width: 390, height: 900, mobile: true },
}
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const MAX_CAPTURE_HEIGHT = 12000

if (!PAGES_FILE) {
  console.error('--pages <file.json> 이 필요합니다.')
  process.exit(2)
}
const pages = JSON.parse(readFileSync(PAGES_FILE, 'utf8'))
if (!Array.isArray(pages)) throw new Error('pages 파일은 배열이어야 합니다.')
mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------------------
// Chrome 찾기·실행
// ---------------------------------------------------------------------------
function findChrome() {
  const candidates = [
    CHROME_OPT,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google\\Chrome\\Application\\chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const c of candidates) if (existsSync(c)) return c
  throw new Error('chrome.exe 를 찾지 못했습니다. --chrome <경로> 로 지정하세요.')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launchChrome() {
  const exe = findChrome()
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'design-audit-chrome-'))
  const flags = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--hide-scrollbars',
    '--window-size=1440,900',
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
  proc.stderr.on('data', (d) => {
    stderr += d.toString()
    if (stderr.length > 20000) stderr = stderr.slice(-10000)
  })
  const deadline = Date.now() + 20000
  let version = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) {
        version = await res.json()
        break
      }
    } catch {}
    if (proc.exitCode !== null) throw new Error(`Chrome 이 바로 종료됨 (code ${proc.exitCode})\n${stderr}`)
    await sleep(250)
  }
  if (!version) throw new Error(`Chrome DevTools 포트(${PORT}) 응답 없음\n${stderr}`)
  console.log(`[chrome] ${version.Browser} (${exe})`)
  return { proc, userDataDir, wsUrl: version.webSocketDebuggerUrl }
}

// ---------------------------------------------------------------------------
// 최소 CDP 클라이언트 (flatten 세션)
// ---------------------------------------------------------------------------
class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.id = 0
    this.pending = new Map()
    this.listeners = new Map() // key: `${sessionId||''}|${method}` -> Set<fn>
  }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      this.ws = ws
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', (e) => reject(new Error(`WebSocket 오류: ${e.message || e}`)))
      ws.addEventListener('message', (ev) => this.onMessage(ev.data))
      ws.addEventListener('close', () => {
        for (const [, p] of this.pending) p.reject(new Error('WebSocket 닫힘'))
        this.pending.clear()
      })
    })
  }
  onMessage(raw) {
    let msg
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
      const key = `${msg.sessionId || ''}|${msg.method}`
      const set = this.listeners.get(key)
      if (set) for (const fn of [...set]) fn(msg.params)
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method })
      this.ws.send(JSON.stringify(payload))
    })
  }
  on(sessionId, method, fn) {
    const key = `${sessionId || ''}|${method}`
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key).add(fn)
    return () => this.listeners.get(key)?.delete(fn)
  }
  once(sessionId, method, timeoutMs) {
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
  close() {
    try {
      this.ws?.close()
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// 페이지 내부에서 실행할 스크립트
// ---------------------------------------------------------------------------
const METRICS_JS = (deviceWidth) => `(() => {
  const DEVICE_WIDTH = ${deviceWidth};
  const cs = (el) => getComputedStyle(el);
  const typo = (el) => el ? {
    text: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
    fontSize: cs(el).fontSize, fontFamily: cs(el).fontFamily, lineHeight: cs(el).lineHeight,
    fontWeight: cs(el).fontWeight, color: cs(el).color,
  } : null;
  const de = document.documentElement;
  const innerWidth = window.innerWidth;
  const main = document.querySelector('main') || document.body;
  const firstN = (sel, n) => Array.from(document.querySelectorAll(sel)).slice(0, n).map(typo);
  const mainEls = Array.from(main.querySelectorAll('*'));

  // 폰트 패밀리
  const ffSet = new Set(); const fontFamilies = [];
  for (const el of mainEls) { const ff = cs(el).fontFamily; if (!ffSet.has(ff)) { ffSet.add(ff); if (fontFamilies.length < 20) fontFamilies.push(ff); } }

  // 본문 컨테이너 폭
  const rectW = (el) => el ? Math.round(el.getBoundingClientRect().width) : null;
  const first = main.firstElementChild;
  let widest = null, widestW = 0;
  for (const c of Array.from(main.children)) { const w = c.getBoundingClientRect().width; if (w > widestW) { widestW = w; widest = c; } }
  const desc = (el) => el ? { tag: el.tagName.toLowerCase(), class: (el.getAttribute('class') || '').slice(0, 120), width: rectW(el), clientWidth: el.clientWidth, maxWidth: cs(el).maxWidth } : null;
  const maxWidths = new Map();
  for (const el of mainEls) { const mw = cs(el).maxWidth; if (mw && mw !== 'none') maxWidths.set(mw, (maxWidths.get(mw) || 0) + 1); }
  const containerMaxWidths = [...maxWidths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count }));

  // 이미지·표
  const imgs = Array.from(document.images);
  const imgOverflow = imgs.filter((i) => i.getBoundingClientRect().width > innerWidth).length;
  const imgOverflowEdge = imgs.filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length;
  const imgBroken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length;
  const tables = Array.from(document.querySelectorAll('table'));
  const tableOverflow = tables.filter((t) => t.scrollWidth > innerWidth).length;

  // 인라인 스타일
  const withStyle = mainEls.filter((el) => el.hasAttribute('style'));
  const styleHas = (s) => withStyle.filter((el) => (el.getAttribute('style') || '').toLowerCase().includes(s)).length;

  // 레거시 클래스
  const legacyRe = /Skin_|moduleCon|pageMaker|AB_|bbs|HStyle|hcenter/i;
  const legacyNames = new Set(); let legacyCount = 0;
  for (const el of mainEls) {
    const cn = el.getAttribute('class') || '';
    if (legacyRe.test(cn)) { legacyCount++; for (const c of cn.split(/\\s+/)) if (legacyRe.test(c) && legacyNames.size < 20) legacyNames.add(c); }
  }

  // 라운드
  const uniq = (els, prop, limit) => { const s = new Set(); for (const el of els) { s.add(cs(el)[prop]); if (s.size >= limit) break; } return [...s]; };
  const buttonsBorderRadius = uniq(Array.from(document.querySelectorAll('button, a[class*="rounded"]')), 'borderRadius', 8);
  const cardRadius = uniq(Array.from(document.querySelectorAll('[class*="rounded-xl"], [class*="shadow"]')), 'borderRadius', 8);

  // 색
  const textColors = new Map(); const bgColors = new Map();
  for (const el of mainEls) {
    const s = cs(el);
    if (el.textContent && el.textContent.trim()) textColors.set(s.color, (textColors.get(s.color) || 0) + 1);
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgColors.set(bg, (bgColors.get(bg) || 0) + 1);
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  // 가로 넘침 원인 후보 (main 안에서 오른쪽 경계를 넘는 요소 상위 5개)
  const overflowers = [];
  for (const el of mainEls) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > DEVICE_WIDTH + 1) { overflowers.push({ tag: el.tagName.toLowerCase(), class: (el.getAttribute('class') || '').slice(0, 80), right: Math.round(r.right), width: Math.round(r.width) }); if (overflowers.length >= 5) break; } }

  const header = document.querySelector('header');
  const body = document.body;
  return {
    title: document.title,
    scrollWidth: de.scrollWidth, innerWidth, deviceWidth: DEVICE_WIDTH,
    // 모바일 에뮬레이션은 가로로 넘치면 축소(zoom-out)해서 innerWidth 자체가 커진다 → 둘 다 본다
    overflowX: de.scrollWidth > DEVICE_WIDTH || innerWidth > DEVICE_WIDTH,
    overflowPx: Math.max(de.scrollWidth, innerWidth) - DEVICE_WIDTH,
    scrollHeight: de.scrollHeight,
    bodyFontFamily: cs(body).fontFamily, bodyFontSize: cs(body).fontSize, bodyColor: cs(body).color, bodyBackground: cs(body).backgroundColor,
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    h1: typo(document.querySelector('h1')), h1Count: document.querySelectorAll('h1').length,
    h2: firstN('h2', 3), h3: firstN('h3', 3), p: firstN('p', 3),
    fontFamilies,
    mainMaxWidth: { main: desc(main), firstChild: desc(first), widestChild: desc(widest), containerMaxWidths },
    imgCount: imgs.length, imgOverflow, imgOverflowEdge, imgBroken,
    tableCount: tables.length, tableOverflow,
    inlineStyleFont: styleHas('font-family'), inlineStyleColor: styleHas('color'), inlineStyleSize: styleHas('font-size'), inlineStyleAny: withStyle.length,
    legacyClasses: { count: legacyCount, names: [...legacyNames] },
    buttonsBorderRadius, cardRadius,
    colors: { text: top(textColors, 12), background: top(bgColors, 12) },
    overflowers,
  };
})()`

const CLICK_JS = (action) => `(() => {
  const a = ${JSON.stringify(action)};
  const root = a.within ? document.querySelector(a.within) : document;
  if (!root) return { ok: false, reason: 'within 없음' };
  const visible = (el) => { if (!el) return false; const r = el.getClientRects(); if (!r.length) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; };
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  let el = null;
  if (a.selector) el = Array.from(root.querySelectorAll(a.selector)).find(visible) || null;
  if (!el && a.text) {
    const cands = Array.from(root.querySelectorAll('button, a, [role="button"], summary, [aria-expanded], [aria-label]')).filter(visible);
    el = cands.find((e) => norm(e.getAttribute('aria-label')) === a.text || norm(e.textContent) === a.text)
      || cands.find((e) => norm(e.textContent).includes(a.text)) || null;
  }
  if (!el && a.fallback) el = Array.from(root.querySelectorAll(a.fallback)).find(visible) || null;
  if (!el) return { ok: false, reason: '요소 없음' };
  if (a.requireExpandable) {
    const expandable = el.tagName === 'BUTTON' || el.tagName === 'SUMMARY' || el.hasAttribute('aria-expanded') || el.getAttribute('role') === 'button';
    if (!expandable) return { ok: false, reason: '펼침 요소 아님(' + el.tagName.toLowerCase() + ')', skipped: true };
  }
  el.scrollIntoView({ block: 'center' });
  el.click();
  return { ok: true, tag: el.tagName.toLowerCase(), text: norm(el.textContent).slice(0, 40) };
})()`

// ---------------------------------------------------------------------------
// 캡처 1건
// ---------------------------------------------------------------------------
function slugOf(p) {
  const clean = p.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '')
  return clean === '' ? 'home' : clean.replace(/\//g, '-')
}

async function evaluate(cdp, sessionId, expression, { awaitPromise = false } = {}) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sessionId)
  if (r.exceptionDetails) {
    const d = r.exceptionDetails
    throw new Error(`페이지 스크립트 오류: ${d.exception?.description || d.text}`)
  }
  return r.result?.value
}

async function capturePage(cdp, page, vp) {
  const url = BASE + page.path
  const name = page.name || slugOf(page.path)
  const file = `${PREFIX}${vp.name}_${name}.png`
  const started = Date.now()
  const issues = []
  const log = (...m) => console.log(`[${vp.name}] ${page.path}`, ...m)

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const offs = []
  try {
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send('Network.enable', {}, sessionId)

    const pushIssue = (kind, text) => {
      if (issues.length < 40) issues.push({ kind, text: String(text).slice(0, 300) })
    }
    offs.push(cdp.on(sessionId, 'Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error' || p.type === 'warning') {
        pushIssue(`console.${p.type}`, p.args.map((a) => a.value ?? a.description ?? '').join(' '))
      }
    }))
    offs.push(cdp.on(sessionId, 'Runtime.exceptionThrown', (p) => {
      pushIssue('exception', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text)
    }))
    offs.push(cdp.on(sessionId, 'Network.responseReceived', (p) => {
      if (p.response.status >= 400) pushIssue(`http.${p.response.status}`, p.response.url)
    }))
    offs.push(cdp.on(sessionId, 'Network.loadingFailed', (p) => {
      if (!p.canceled) pushIssue('loadingFailed', `${p.errorText} ${p.type || ''}`)
    }))

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile,
    }, sessionId)
    if (vp.mobile) {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId)
      await cdp.send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA, acceptLanguage: 'ko-KR,ko' }, sessionId)
    } else {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }, sessionId)
    }

    // 이동 + load 대기
    const loadP = cdp.once(sessionId, 'Page.loadEventFired', LOAD_TIMEOUT)
    // 서버 응답이 느려 Page.navigate 자체가 LOAD_TIMEOUT 보다 오래 걸리면 loadP 의 거부가
    // 처리되지 않은 채 프로세스를 죽인다 → 미리 catch 를 달고, navigate 와 경합시켜 페이지 단위로 실패 처리
    loadP.catch(() => {})
    const nav = await Promise.race([cdp.send('Page.navigate', { url }, sessionId), loadP.then(() => ({}))])
    if (nav && nav.errorText) throw new Error(`이동 실패: ${nav.errorText}`)
    await loadP
    const loadMs = Date.now() - started
    await sleep(1500)

    // 스크롤 훑기 (lazy 이미지 트리거)
    let scrollHeight = await evaluate(cdp, sessionId, 'document.documentElement.scrollHeight')
    for (let y = 0; y <= scrollHeight; y += 700) {
      await evaluate(cdp, sessionId, `window.scrollTo(0, ${y})`)
      await sleep(250)
      if (y === 0) scrollHeight = await evaluate(cdp, sessionId, 'document.documentElement.scrollHeight')
    }
    await evaluate(cdp, sessionId, 'window.scrollTo(0, 0)')
    // 이미지 로드 대기 (최대 6초)
    const imgDeadline = Date.now() + 6000
    let imgState = null
    while (Date.now() < imgDeadline) {
      imgState = await evaluate(cdp, sessionId, `(() => { const im = Array.from(document.images); return { total: im.length, pending: im.filter((i) => !i.complete).length }; })()`)
      if (imgState.pending === 0) break
      await sleep(200)
    }

    // 추가 동작 (메뉴 열기 등)
    const actionResults = []
    for (const action of page.actions || []) {
      if (action.type === 'wait') {
        await sleep(action.ms ?? 500)
        actionResults.push({ type: 'wait', ms: action.ms ?? 500 })
      } else if (action.type === 'click') {
        const r = await evaluate(cdp, sessionId, CLICK_JS(action))
        actionResults.push({ type: 'click', ...action, result: r })
        if (!r.ok && !action.optional && !r.skipped) throw new Error(`click 실패 (${action.selector || action.text}): ${r.reason}`)
        log(`action click ${action.selector || action.text}:`, r.ok ? `ok <${r.tag}> ${r.text}` : `skip (${r.reason})`)
      }
    }
    if (actionResults.length) await sleep(300)

    // 지표
    const metrics = await evaluate(cdp, sessionId, METRICS_JS(vp.width))
    scrollHeight = metrics.scrollHeight
    const captureHeight = Math.max(vp.height, Math.min(scrollHeight, MAX_CAPTURE_HEIGHT))

    // 전체 높이로 늘린 뒤 캡처
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: captureHeight, deviceScaleFactor: 1, mobile: vp.mobile,
    }, sessionId)
    await sleep(400)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
    const buf = Buffer.from(shot.data, 'base64')
    writeFileSync(path.join(OUT, file), buf)

    const elapsed = Date.now() - started
    log(`→ ${file} (${(buf.length / 1024).toFixed(0)} KB, ${vp.width}x${captureHeight}, load ${loadMs}ms, total ${elapsed}ms)`)
    return {
      metrics: { url, path: page.path, viewport: vp.name, viewportWidth: vp.width, file, capturedAt: new Date().toISOString(), ...metrics },
      index: {
        url, path: page.path, viewport: vp.name, file, bytes: buf.length,
        width: vp.width, height: captureHeight, scrollHeight, truncated: scrollHeight > MAX_CAPTURE_HEIGHT,
        loadMs, totalMs: elapsed, capturedAt: new Date().toISOString(),
        images: imgState, actions: actionResults, issues, error: null,
      },
    }
  } finally {
    for (const off of offs) off()
    try {
      await cdp.send('Target.closeTarget', { targetId })
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------
function loadJson(file, def) {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : def
  } catch {
    return def
  }
}

async function main() {
  const metricsFile = path.join(OUT, 'metrics.json')
  const indexFile = path.join(OUT, 'index.json')
  const metricsAll = loadJson(metricsFile, [])
  const indexAll = loadJson(indexFile, [])
  const upsert = (arr, entry) => {
    const i = arr.findIndex((e) => e.file === entry.file)
    if (i >= 0) arr[i] = entry
    else arr.push(entry)
  }
  const save = () => {
    writeFileSync(metricsFile, JSON.stringify(metricsAll, null, 2))
    writeFileSync(indexFile, JSON.stringify(indexAll, null, 2))
  }

  const chrome = await launchChrome()
  const cdp = new CDP(chrome.wsUrl)
  await cdp.connect()
  let ok = 0, failed = 0
  try {
    for (const page of pages) {
      const vpNames = (page.viewports || VIEWPORT_NAMES).filter((v) => VIEWPORT_NAMES.includes(v))
      for (const vpName of vpNames) {
        const vp = VIEWPORTS[vpName]
        if (!vp) {
          console.warn(`알 수 없는 viewport: ${vpName}`)
          continue
        }
        const name = page.name || slugOf(page.path)
        const file = `${PREFIX}${vp.name}_${name}.png`
        try {
          const r = await capturePage(cdp, page, vp)
          upsert(metricsAll, r.metrics)
          upsert(indexAll, r.index)
          ok++
        } catch (err) {
          failed++
          console.error(`[${vp.name}] ${page.path} 실패: ${err.message}`)
          upsert(indexAll, {
            url: BASE + page.path, path: page.path, viewport: vp.name, file, bytes: 0,
            capturedAt: new Date().toISOString(), error: err.message,
          })
        }
        save()
      }
    }
  } finally {
    cdp.close()
    // 렌더러 고아 프로세스가 남지 않도록 부모가 살아 있을 때 트리째 종료
    if (chrome.proc.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(chrome.proc.pid), '/T', '/F'], { stdio: 'ignore' })
      else { try { chrome.proc.kill('SIGKILL') } catch {} }
    }
    for (let i = 0; i < 20 && chrome.proc.exitCode === null; i++) await sleep(100)
    await sleep(300)
    for (let i = 0; i < 5; i++) {
      try { rmSync(chrome.userDataDir, { recursive: true, force: true }); break } catch { await sleep(500) }
    }
  }
  console.log(`\n완료: 성공 ${ok}, 실패 ${failed} → ${OUT}`)
  process.exitCode = failed > 0 ? 1 : 0
}

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err instanceof Error ? err.message : err)
})

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
