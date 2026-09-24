#!/usr/bin/env node
/**
 * 사진 선명도·로딩 측정 (헤드리스 크롬, 고해상도 화면 에뮬레이션).
 *   node scripts/perf/image-sharpness.mjs --base https://jaramk.vercel.app --out <폴더> [--port 9370]
 * 페이지(홈 히어로, 앨범 상세)마다 PC(DPR 2)·모바일(DPR 3)로:
 *  - 보이는 사진별 화면 크기 × DPR 대비 실제 받은 이미지 가로 픽셀(naturalWidth) → ratio ≥ 1 이면 확대(흐림) 없음
 *  - 받은 사본 URL(w=, q=), 로드 시간(TTFB·load·LCP), 첫 화면 사진이 다 뜬 시각
 *  - 첫 사진 부분 확대 캡처(PNG, 기기 픽셀 그대로)
 * 아무것도 바꾸지 않는다.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const BASE = opt('base', 'http://127.0.0.1:3000').replace(/\/+$/, '')
const OUT = path.resolve(opt('out', 'scripts/perf/sharpness'))
const PORT = Number(opt('port', 9370))
const PAGES = [
  { name: 'home-hero', path: '/', selector: 'section img' },
  { name: 'album-detail', path: opt('album', '/board/story/14967c28-1efb-43ed-b665-e2b9e711c40b'), selector: 'article img' },
]
const VIEWPORTS = [
  { name: 'pc', width: 1440, height: 900, dpr: 2, mobile: false },
  { name: 'mobile', width: 390, height: 844, dpr: 3, mobile: true },
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function findChrome() {
  for (const x of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if (existsSync(x)) return x
  throw new Error('chrome 없음')
}
class CDP {
  constructor(u) { this.u = u; this.id = 0; this.p = new Map(); this.l = new Map() }
  connect() { return new Promise((res, rej) => { const ws = new WebSocket(this.u); this.ws = ws; ws.addEventListener('open', () => res()); ws.addEventListener('error', (e) => rej(e)); ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id !== undefined) { const q = this.p.get(m.id); if (!q) return; this.p.delete(m.id); m.error ? q.rej(new Error(m.error.message)) : q.res(m.result) } else if (m.method) { const s = this.l.get(`${m.sessionId || ''}|${m.method}`); if (s) for (const f of [...s]) f(m.params) } }) }) }
  send(method, params = {}, sessionId) { const id = ++this.id; const pl = { id, method, params }; if (sessionId) pl.sessionId = sessionId; return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify(pl)) }) }
  once(sid, method, ms) { return new Promise((res, rej) => { const k = `${sid || ''}|${method}`; if (!this.l.has(k)) this.l.set(k, new Set()); const f = (p) => { this.l.get(k).delete(f); clearTimeout(t); res(p) }; this.l.get(k).add(f); const t = setTimeout(() => { this.l.get(k).delete(f); rej(new Error('timeout ' + method)) }, ms) }) }
}
const evalv = async (cdp, sid, expression) => { const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval'); return r.result.value }

const MEASURE = (selector) => `(async () => {
  const imgs = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 40 && r.height > 40 && r.top < innerHeight && r.bottom > 0 && getComputedStyle(i).opacity !== '0' && getComputedStyle(i.parentElement).opacity !== '0' });
  await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; setTimeout(r, 15000) })));
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const dpr = devicePixelRatio;
  // srcset(w 서술자) 이미지는 naturalWidth 가 밀도 보정된 값이라, 받은 파일을 새로 읽어 실제 픽셀을 잰다
  const truePx = (src) => new Promise((res) => { const t = new Image(); t.onload = () => res({ w: t.naturalWidth, h: t.naturalHeight }); t.onerror = () => res(null); t.src = src; });
  const rows = [];
  for (const i of imgs) {
    const r = i.getBoundingClientRect();
    const src = i.currentSrc || i.src;
    const px = await truePx(src);
    const u = new URL(src, location.href);
    const e = res.find((x) => x.name === src);
    // object-fit 에 따라 사진이 칸에 그려지는 배율 (cover: 칸을 꽉 채우도록 확대, contain: 칸 안에 들어가게)
    const fit = getComputedStyle(i).objectFit;
    const scale = px ? (fit === 'cover' ? Math.max(r.width / px.w, r.height / px.h) : fit === 'contain' ? Math.min(r.width / px.w, r.height / px.h) : r.width / px.w) : null;
    // 화면 1 기기픽셀당 사진 픽셀 수. 1 이상이면 확대(흐림) 없음
    const ratio = scale ? +(1 / (scale * dpr)).toFixed(2) : null;
    rows.push({ box: Math.round(r.width) + 'x' + Math.round(r.height), fit, px: px ? px.w + 'x' + px.h : null, ratio, w: u.searchParams.get('w'), q: u.searchParams.get('q'), optimized: u.pathname.startsWith('/_next/image'), loading: i.loading, fetchPriority: i.fetchPriority, bytes: e ? e.transferSize || e.encodedBodySize : null, doneAt: e ? Math.round(e.responseEnd) : null });
  }
  return { dpr, ttfb: Math.round(nav.responseStart), load: Math.round(nav.loadEventEnd), lcp: window.__lcp || null, visible: rows.length, firstScreenDone: rows.length ? Math.max(...rows.map((x) => x.doneAt || 0)) : null, minRatio: rows.length ? Math.min(...rows.map((x) => x.ratio)) : null, rows: rows.slice(0, 8) };
})()`

async function main() {
  mkdirSync(OUT, { recursive: true })
  const ud = mkdtempSync(path.join(tmpdir(), 'sharp-chrome-'))
  const proc = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${ud}`, '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--lang=ko-KR', 'about:blank'], { stdio: 'ignore' })
  let v = null
  for (let i = 0; i < 80 && !v; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) v = await r.json() } catch {} await sleep(250) }
  const cdp = new CDP(v.webSocketDebuggerUrl)
  await cdp.connect()
  const all = []
  try {
    for (const page of PAGES) for (const vp of VIEWPORTS) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
      await cdp.send('Page.enable', {}, sid); await cdp.send('Runtime.enable', {}, sid); await cdp.send('Network.enable', {}, sid)
      await cdp.send('Network.clearBrowserCache', {}, sid)
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile }, sid)
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{new PerformanceObserver((l)=>{for(const e of l.getEntries()) window.__lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}` }, sid)
      const lp = cdp.once(sid, 'Page.loadEventFired', 45000)
      await cdp.send('Page.navigate', { url: BASE + page.path }, sid)
      await lp
      await sleep(1500)
      const m = await evalv(cdp, sid, MEASURE(page.selector))
      // 첫 보이는 사진의 가운데 부분을 기기 픽셀 그대로 확대 캡처
      const box = await evalv(cdp, sid, `(() => { const i = [...document.querySelectorAll(${JSON.stringify(page.selector)})].find((i) => { const r = i.getBoundingClientRect(); return r.width > 40 && r.top < innerHeight && r.bottom > 0 && getComputedStyle(i.parentElement).opacity !== '0' }); if (!i) return null; const r = i.getBoundingClientRect(); const w = Math.min(r.width, 220), h = Math.min(r.height, 220); return { x: r.left + (r.width - w) / 2 + scrollX, y: r.top + (r.height - h) / 2 + scrollY, width: w, height: h } })()`)
      let shot = null
      if (box) {
        const cap = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 1 }, captureBeyondViewport: true }, sid)
        shot = path.join(OUT, `${page.name}_${vp.name}_zoom.png`)
        writeFileSync(shot, Buffer.from(cap.data, 'base64'))
      }
      const row = { page: page.name, viewport: vp.name, ...m, zoom: shot }
      all.push(row)
      console.log(`${page.name} ${vp.name} dpr${m.dpr}: ttfb ${m.ttfb} load ${m.load} lcp ${m.lcp ?? '-'} 첫화면사진완료 ${m.firstScreenDone} | 보이는 ${m.visible}장 최소 해상도비 ${m.minRatio} | 예: ${m.rows.slice(0, 2).map((r) => `칸 ${r.box} ${r.fit} ← 받은 ${r.px} 비 ${r.ratio} (w=${r.w ?? '원본'} q=${r.q ?? '-'} ${r.loading}/${r.fetchPriority} ${r.bytes ? Math.round(r.bytes / 1024) + 'KB' : ''})`).join(' ; ')}`)
      await cdp.send('Target.closeTarget', { targetId })
    }
  } finally { cdp.ws.close(); proc.kill(); await sleep(300); try { rmSync(ud, { recursive: true, force: true }) } catch {} }
  writeFileSync(path.join(OUT, 'sharpness.json'), JSON.stringify({ base: BASE, measuredAt: new Date().toISOString(), results: all }, null, 2))
  console.log('저장:', OUT)
}
main().catch((e) => { console.error('실패:', e.message); process.exit(1) })
