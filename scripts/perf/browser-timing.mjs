#!/usr/bin/env node
/**
 * 브라우저 체감 속도 측정 (헤드리스 크롬 + DevTools Protocol).
 *   node scripts/perf/browser-timing.mjs --base https://jaramk.vercel.app --pages scripts/perf/pages.json --out out.json [--runs 2] [--port 9360] [--mobile]
 * pages.json: [{ path, name?, click?: { text?, selector?, within?, expect? } }]
 *   - 페이지: TTFB, DOMContentLoaded, load, LCP, 리소스 수/바이트(종류별), 폰트·이미지 상위, 외부 호스트
 *   - click: 로드 후 링크를 눌러 새 화면(h1 또는 main 내용 변화)이 뜰 때까지 걸린 시간, 클라이언트 전환/전체 새로고침 여부, 클릭 전 prefetch 여부
 * 결과는 JSON + 콘솔 표. 측정만 하고 아무것도 바꾸지 않는다.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const has = (n) => args.includes(`--${n}`)
const BASE = opt('base', 'http://127.0.0.1:3000').replace(/\/+$/, '')
const PAGES = JSON.parse(readFileSync(opt('pages', 'scripts/perf/pages.json'), 'utf8'))
const OUT = opt('out', null)
const RUNS = Number(opt('runs', 2))
const PORT = Number(opt('port', 9360))
const MOBILE = has('mobile')
const LABEL = opt('label', BASE)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function findChrome() {
  const c = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const x of c) if (existsSync(x)) return x
  throw new Error('chrome.exe 를 찾지 못했습니다.')
}

class CDP {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.listeners = new Map() }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      this.ws = ws
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', (e) => reject(new Error(`WebSocket 오류: ${e.message || e}`)))
      ws.addEventListener('message', (ev) => this.onMessage(ev.data))
      ws.addEventListener('close', () => { for (const [, p] of this.pending) p.reject(new Error('WebSocket 닫힘')); this.pending.clear() })
    })
  }
  onMessage(raw) {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`))
      else p.resolve(msg.result)
      return
    }
    if (msg.method) {
      const set = this.listeners.get(`${msg.sessionId || ''}|${msg.method}`)
      if (set) for (const fn of [...set]) fn(msg.params)
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject, method }); this.ws.send(JSON.stringify(payload)) })
  }
  on(sessionId, method, fn) {
    const key = `${sessionId || ''}|${method}`
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key).add(fn)
    return () => this.listeners.get(key)?.delete(fn)
  }
  once(sessionId, method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const off = this.on(sessionId, method, (p) => { off(); clearTimeout(t); resolve(p) })
      const t = setTimeout(() => { off(); reject(new Error(`${method} 대기 시간 초과`)) }, timeoutMs)
    })
  }
  close() { try { this.ws?.close() } catch {} }
}

async function launchChrome() {
  const exe = findChrome()
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'perf-chrome-'))
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`, '--window-size=1440,900', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-sync', '--mute-audio', '--lang=ko-KR', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const deadline = Date.now() + 20000
  let version = null
  while (Date.now() < deadline) {
    try { const res = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (res.ok) { version = await res.json(); break } } catch {}
    if (proc.exitCode !== null) throw new Error(`Chrome 종료 (code ${proc.exitCode})`)
    await sleep(250)
  }
  if (!version) throw new Error('Chrome DevTools 응답 없음')
  return { proc, userDataDir, wsUrl: version.webSocketDebuggerUrl }
}

const LCP_OBSERVER = `try{new PerformanceObserver((l)=>{for(const e of l.getEntries()) window.__lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}`

const PAGE_METRICS = `(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const by = {};
  for (const r of res) { const t = r.initiatorType || 'other'; by[t] ??= { count: 0, bytes: 0 }; by[t].count++; by[t].bytes += r.transferSize || 0; }
  const short = (n) => n.replace(/^https?:\\/\\/[^/]+/, '').split('?')[0].slice(-50);
  const fonts = res.filter((r) => /\\.(woff2?|ttf|otf)(\\?|$)/.test(r.name)).map((r) => ({ name: short(r.name), ms: Math.round(r.responseEnd - r.startTime), bytes: r.transferSize }));
  const imgs = res.filter((r) => r.initiatorType === 'img' || /_next\\/image/.test(r.name)).map((r) => ({ name: short(r.name), bytes: r.transferSize, ms: Math.round(r.responseEnd - r.startTime), end: Math.round(r.responseEnd) })).sort((a, b) => b.bytes - a.bytes).slice(0, 6);
  const external = [...new Set(res.filter((r) => !r.name.startsWith(location.origin)).map((r) => new URL(r.name).host))];
  const rsc = res.filter((r) => /_rsc=/.test(r.name)).length;
  const supa = res.filter((r) => /supabase\\.co/.test(r.name)).map((r) => ({ name: short(r.name), ms: Math.round(r.responseEnd - r.startTime) }));
  return {
    ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd),
    docBytes: nav.transferSize, lcp: window.__lcp || null, resources: res.length,
    totalBytes: res.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0),
    by, fonts, imgs, external, prefetchRsc: rsc, supabaseCalls: supa,
    plainAnchors: [...document.querySelectorAll('a[href^="/"]')].length,
    h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 40),
  };
})()`

async function evaluate(cdp, sid, expression, awaitPromise = false) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sid)
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}

async function measurePage(cdp, page, run) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const out = { path: page.path, name: page.name || page.path, run }
  try {
    await cdp.send('Page.enable', {}, sid)
    await cdp.send('Runtime.enable', {}, sid)
    await cdp.send('Network.enable', {}, sid)
    await cdp.send('Network.clearBrowserCache', {}, sid)
    await cdp.send('Network.clearBrowserCookies', {}, sid)
    if (MOBILE) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, sid)
      await cdp.send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' }, sid)
    } else {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
    }
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: LCP_OBSERVER }, sid)
    // 클릭 전 prefetch(RSC) 요청 관찰
    let rscRequests = 0
    const offReq = cdp.on(sid, 'Network.requestWillBeSent', (p) => { if (/_rsc=/.test(p.request.url) || (p.request.headers && p.request.headers.RSC === '1')) rscRequests++ })
    const loadP = cdp.once(sid, 'Page.loadEventFired', 45000)
    const t0 = Date.now()
    await cdp.send('Page.navigate', { url: BASE + page.path }, sid)
    await loadP
    out.wallLoadMs = Date.now() - t0
    await sleep(1200) // LCP 확정·하이드레이션·뷰포트 링크 prefetch 대기
    Object.assign(out, await evaluate(cdp, sid, PAGE_METRICS))
    out.prefetchBeforeClick = rscRequests
    if (page.click) {
      const c = page.click
      const setup = `(() => {
        const root = document.querySelector(${JSON.stringify(c.within || 'body')}) || document.body;
        let el = ${c.selector ? `root.querySelector(${JSON.stringify(c.selector)})` : 'null'};
        if (!el && ${JSON.stringify(c.text || '')}) {
          const t = ${JSON.stringify(c.text || '')};
          const cands = [...root.querySelectorAll('a[href]')];
          el = cands.find((a) => a.textContent.trim() === t) || cands.find((a) => a.textContent.trim().includes(t));
        }
        if (!el) return { error: 'link not found' };
        window.__navMarker = 1;
        window.__oldH1 = (document.querySelector('h1')?.textContent || '').trim();
        window.__oldMain = document.querySelector('main')?.innerHTML.length || 0;
        window.__t0 = performance.now();
        el.click();
        return { href: el.getAttribute('href') };
      })()`
      const s = await evaluate(cdp, sid, setup)
      const clickWall = Date.now()
      out.click = { text: c.text || c.selector, href: s.href, error: s.error }
      if (!s.error) {
        const expect = c.expect || s.href
        const deadline = Date.now() + 20000
        let done = null
        while (Date.now() < deadline) {
          await sleep(40)
          let st
          try {
            st = await evaluate(cdp, sid, `({ path: location.pathname, marker: !!window.__navMarker, h1: (document.querySelector('h1')?.textContent || '').trim(), mainLen: document.querySelector('main')?.innerHTML.length || 0, t: performance.now(), t0: window.__t0 || null, oldH1: window.__oldH1 || null, oldMain: window.__oldMain || null })`)
          } catch { continue } // 전체 새로고침 중이면 evaluate 가 실패할 수 있음
          const arrived = st.path === expect || (expect && st.path.startsWith(expect))
          const changed = st.marker ? (st.h1 !== st.oldH1 || st.mainLen !== st.oldMain) : (st.h1 && st.mainLen > 0)
          if (arrived && changed) {
            done = { ms: st.marker && st.t0 ? Math.round(st.t - st.t0) : Date.now() - clickWall, mode: st.marker ? 'client' : 'full-reload', to: st.path, h1: st.h1.slice(0, 30) }
            break
          }
        }
        out.click = { ...out.click, ...(done || { ms: null, mode: 'timeout' }) }
      }
    }
    offReq()
  } catch (e) {
    out.error = String(e.message || e).slice(0, 200)
  } finally {
    try { await cdp.send('Target.closeTarget', { targetId }) } catch {}
  }
  return out
}

const fmtKB = (b) => (b == null ? '-' : `${Math.round(b / 1024)}KB`)

async function main() {
  const chrome = await launchChrome()
  const cdp = new CDP(chrome.wsUrl)
  await cdp.connect()
  const results = []
  try {
    for (const page of PAGES) {
      for (let run = 1; run <= RUNS; run++) {
        const r = await measurePage(cdp, page, run)
        results.push(r)
        const clk = r.click ? ` | 클릭 "${r.click.text}" → ${r.click.mode} ${r.click.ms ?? '-'}ms` : ''
        console.log(`[${LABEL}] ${r.name} run${run}: ttfb ${r.ttfb}ms dcl ${r.dcl}ms load ${r.load}ms lcp ${r.lcp ?? '-'}ms | ${r.resources}req ${fmtKB(r.totalBytes)} (img ${fmtKB(r.by?.img?.bytes)}, script ${fmtKB(r.by?.script?.bytes)}, font ${fmtKB(r.fonts?.reduce((s, f) => s + (f.bytes || 0), 0))}) prefetch ${r.prefetchBeforeClick}${clk}${r.error ? ' | ERROR ' + r.error : ''}`)
      }
    }
  } finally {
    cdp.close()
    chrome.proc.kill()
    await sleep(300)
    try { rmSync(chrome.userDataDir, { recursive: true, force: true }) } catch {}
  }
  if (OUT) {
    mkdirSync(path.dirname(OUT), { recursive: true })
    writeFileSync(OUT, JSON.stringify({ base: BASE, label: LABEL, mobile: MOBILE, measuredAt: new Date().toISOString(), results }, null, 2))
    console.log(`저장: ${OUT}`)
  }
}

main().catch((e) => { console.error('실패:', e.message || e); process.exit(1) })
