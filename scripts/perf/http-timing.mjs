#!/usr/bin/env node
/**
 * HTTP 응답 시간 측정 (문서 요청만): TTFB(헤더 도착)·전체·상태·캐시/지역 헤더.
 *   node scripts/perf/http-timing.mjs --base https://jaramk.vercel.app --paths /,/about/class --runs 3 [--out out.json] [--sleep 500]
 * 브라우저 없이 서버 응답만 본다. 아무것도 바꾸지 않는다.
 */
import https from 'node:https'
import http from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const BASE = opt('base', 'http://127.0.0.1:3000').replace(/\/+$/, '')
const PATHS = opt('paths', '/').split(',').map((s) => s.trim()).filter(Boolean)
const RUNS = Number(opt('runs', 3))
const SLEEP = Number(opt('sleep', 300))
const OUT = opt('out', null)
const LABEL = opt('label', BASE)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function timeOnce(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http
    const t0 = performance.now()
    const req = lib.get(url, { headers: { 'User-Agent': 'perf-http-timing/1.0', Accept: 'text/html,*/*' } }, (res) => {
      const ttfb = performance.now() - t0
      let bytes = 0
      res.on('data', (c) => { bytes += c.length })
      res.on('end', () => {
        const h = res.headers
        resolve({
          status: res.statusCode, ttfb: Math.round(ttfb), total: Math.round(performance.now() - t0), bytes,
          cache: h['x-vercel-cache'] || h['x-nextjs-cache'] || null,
          vercelId: h['x-vercel-id'] || null,
          age: h['age'] ?? null,
          cacheControl: h['cache-control'] || null,
          location: h['location'] || null,
        })
      })
    })
    req.on('error', (e) => resolve({ status: 0, error: e.message, ttfb: null, total: null }))
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')) })
  })
}

const results = []
for (const p of PATHS) {
  for (let run = 1; run <= RUNS; run++) {
    const r = await timeOnce(BASE + p)
    results.push({ path: p, run, ...r })
    const region = r.vercelId ? r.vercelId.split('::').slice(0, 2).join('→') : '-'
    console.log(`[${LABEL}] ${p} #${run}: ${r.status} ttfb ${r.ttfb}ms total ${r.total}ms ${r.bytes ? Math.round(r.bytes / 1024) + 'KB' : ''} cache=${r.cache ?? '-'} age=${r.age ?? '-'} ${region}${r.location ? ' → ' + r.location : ''}${r.error ? ' ERR ' + r.error : ''}`)
    await sleep(SLEEP)
  }
}
if (OUT) {
  mkdirSync(path.dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify({ base: BASE, label: LABEL, measuredAt: new Date().toISOString(), results }, null, 2))
  console.log(`저장: ${OUT}`)
}
