#!/usr/bin/env node
/**
 * 옛 페이지 캡처의 위·아래 부분을 모아 보는 조사용 한 장 (로컬 파일만 읽음).
 *   node scripts/deco/contact-sheet.mjs --out <png> --codes 8,10,... [--top 900] [--bottom 700] [--cols 5]
 * pagemaker-full/<code>@1x.webp 가 있으면 그것을, 없으면 --old 폴더의 old_<code>.png 본문 열(x 491, 폭 700)을 쓴다.
 */
import sharp from 'sharp'
import { existsSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d }
const CODES = opt('codes', '').split(',').filter(Boolean)
const OUT = opt('out', 'sheet.png')
const TOP = Number(opt('top', 900))
const BOTTOM = Number(opt('bottom', 700))
const COLS = Number(opt('cols', 5))
const PM = 'C:/Project/jaram-migration-data/files/pagemaker-full/'
const OLD = opt('old', 'C:/Project/jaram/scripts/design-audit/screenshots/deco/old/')
const W = 700
const GAP = 16
const LABEL = 36

async function source(code) {
  const pm = `${PM}${code}@1x.webp`
  if (existsSync(pm)) return { img: sharp(pm), meta: await sharp(pm).metadata(), left: 0, top: 0 }
  const o = `${OLD}old_${code}.png`
  const m = await sharp(o).metadata()
  // 본문 열: x 491~1191, y 328 부터 (푸터 위까지)
  return { img: sharp(o), meta: { width: W, height: m.height - 328 - 150 }, left: 491, top: 328 }
}

const tiles = []
for (const code of CODES) {
  const s = await source(code)
  const h = s.meta.height
  const topH = Math.min(TOP, h)
  const botH = Math.min(BOTTOM, Math.max(0, h - topH))
  const parts = [await sharp(await s.img.clone().extract({ left: s.left, top: s.top, width: W, height: topH }).png().toBuffer()).toBuffer()]
  if (botH > 0) parts.push(await sharp(await s.img.clone().extract({ left: s.left, top: s.top + h - botH, width: W, height: botH }).png().toBuffer()).toBuffer())
  const tileH = LABEL + topH + (botH ? 8 + botH : 0)
  const svgLabel = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#222"/><text x="10" y="25" font-size="20" fill="#fff" font-family="Malgun Gothic, sans-serif">pageCode ${code}  (위 ${topH}px · 아래 ${botH}px)</text></svg>`)
  const comps = [{ input: svgLabel, left: 0, top: 0 }, { input: parts[0], left: 0, top: LABEL }]
  if (parts[1]) comps.push({ input: parts[1], left: 0, top: LABEL + topH + 8 })
  tiles.push(await sharp({ create: { width: W, height: tileH, channels: 3, background: '#bbbbbb' } }).composite(comps).png().toBuffer())
}
const rows = Math.ceil(tiles.length / COLS)
const tileH = Math.max(...(await Promise.all(tiles.map(async (t) => (await sharp(t).metadata()).height))))
const sheetW = COLS * W + (COLS + 1) * GAP
const sheetH = rows * tileH + (rows + 1) * GAP
await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#ffffff' } })
  .composite(tiles.map((t, i) => ({ input: t, left: GAP + (i % COLS) * (W + GAP), top: GAP + Math.floor(i / COLS) * (tileH + GAP) })))
  .png()
  .toFile(OUT)
console.log('saved', OUT, sheetW, sheetH)
