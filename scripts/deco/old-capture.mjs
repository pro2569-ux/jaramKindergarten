#!/usr/bin/env node
/**
 * 옛 jaramk.com 페이지 참고용 캡처 (읽기만, 2초 간격).
 *   node scripts/deco/old-capture.mjs --codes 1,2,4,5,66,11,65 --out <폴더> [--port 9380]
 * 각 pageCode 마다: 전체 페이지(PC 1440, DPR 1) + 본문 영역 좌표(JSON) 저장.
 * 참고(위치·분위기 파악)용이며, 그림을 잘라 사이트에 쓰지 않는다.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const CODES = opt('codes', '1').split(',').map((s) => s.trim()).filter(Boolean)
const OUT = path.resolve(opt('out', 'scripts/design-audit/screenshots/deco/old'))
const PORT = Number(opt('port', 9380))
const GAP_MS = 2000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function findChrome() {
  for (const x of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome']) if (existsSync(x)) return x
  throw new Error('chrome 없음')
}
class CDP {
  constructor(u) { this.u = u; this.id = 0; this.p = new Map(); this.l = new Map() }
  connect() { return new Promise((res, rej) => { const ws = new WebSocket(this.u); this.ws = ws; ws.addEventListener('open', () => res()); ws.addEventListener('error', (e) => rej(e)); ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id !== undefined) { const q = this.p.get(m.id); if (!q) return; this.p.delete(m.id); if (m.error) q.rej(new Error(m.error.message)); else q.res(m.result) } else if (m.method) { const s = this.l.get(`${m.sessionId || ''}|${m.method}`); if (s) for (const f of [...s]) f(m.params) } }) }) }
  send(method, params = {}, sessionId) { const id = ++this.id; const pl = { id, method, params }; if (sessionId) pl.sessionId = sessionId; return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify(pl)) }) }
  once(sid, method, ms) { return new Promise((res, rej) => { const k = `${sid || ''}|${method}`; if (!this.l.has(k)) this.l.set(k, new Set()); const f = (p) => { this.l.get(k).delete(f); clearTimeout(t); res(p) }; this.l.get(k).add(f); const t = setTimeout(() => { this.l.get(k).delete(f); rej(new Error('timeout ' + method)) }, ms) }) }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const ud = mkdtempSync(path.join(tmpdir(), 'old-cap-'))
  const proc = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${ud}`, '--hide-scrollbars', '--no-first-run', '--lang=ko-KR', 'about:blank'], { stdio: 'ignore' })
  let v = null
  for (let i = 0; i < 80 && !v; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) v = await r.json() } catch {} await sleep(250) }
  const cdp = new CDP(v.webSocketDebuggerUrl)
  await cdp.connect()
  const meta = []
  try {
    for (const code of CODES) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
      const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
      await cdp.send('Page.enable', {}, sid); await cdp.send('Runtime.enable', {}, sid)
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
      const lp = cdp.once(sid, 'Page.loadEventFired', 45000)
      await cdp.send('Page.navigate', { url: `http://jaramk.com/main/sub.html?pageCode=${code}` }, sid)
      await lp
      await sleep(1500)
      const info = (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
        const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } };
        const content = document.querySelector('#pageMakerBaseLayer') || document.querySelector('#contents, #content, .contents, .sub_contents, #sub_contents, .sub-content');
        return { title: document.title, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, content: box(content), contentSel: content ? (content.id ? '#' + content.id : '.' + [...content.classList].join('.')) : null };
      })()` }, sid)).result.value
      const h = Math.min(info.height, 12000)
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: h, deviceScaleFactor: 1, mobile: false }, sid)
      await sleep(500)
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: h, scale: 1 } }, sid)
      const file = path.join(OUT, `old_${code}.png`)
      writeFileSync(file, Buffer.from(shot.data, 'base64'))
      meta.push({ code, file, ...info })
      console.log(`pageCode ${code}: ${info.width}x${info.height} content=${info.contentSel} ${JSON.stringify(info.content)}`)
      await cdp.send('Target.closeTarget', { targetId })
      await sleep(GAP_MS)
    }
  } finally { cdp.ws.close(); proc.kill(); await sleep(300); try { rmSync(ud, { recursive: true, force: true }) } catch {} }
  writeFileSync(path.join(OUT, 'old-capture.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pages: meta }, null, 2))
}
main().catch((e) => { console.error('실패:', e.message); process.exit(1) })
