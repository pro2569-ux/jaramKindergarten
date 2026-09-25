#!/usr/bin/env node
/**
 * 옛 사이트 장식 참고 시트 — 페이지별 장식 부분만 잘라 한 장에 모은다 (내부 참고용, 사이트에 쓰지 않음).
 *   node scripts/deco/reference-sheet.mjs --out <png>
 * 좌표는 본문 열(폭 700, 1x) 기준. y 가 음수면 아래에서부터.
 */
import sharp from 'sharp'
import { existsSync } from 'node:fs'

const args = process.argv.slice(2)
const OUT = args[args.indexOf('--out') + 1] || 'reference-sheet.png'
const PM = 'C:/Project/jaram-migration-data/files/pagemaker-full/'
const OLD = 'C:/Project/jaram/scripts/design-audit/screenshots/deco/old/'

// [pageCode, 라벨, [{ y, h, x?, w?, note }]]
const CROPS = [
  ['frame', '서브 공통: 환영 띠·사이드바 제목', [{ frame: true, x: 220, y: 100, w: 1060, h: 180, note: '초록 언덕 띠·점무늬·구름·새·해' }]],
  [1, '인사말', [{ y: 40, h: 170, note: '구름 언덕·이정표·새싹·집·해' }, { y: -190, h: 170, note: '구름·별·작은 집' }]],
  [2, '교육이념/원훈', [{ y: 0, h: 230, note: '인용부호·책·연필·화분' }]],
  [4, '교육환경', [{ y: 0, h: 110, x: 350, w: 350, note: '나비' }, { y: -200, h: 150, note: '해바라기·잎 흩날림' }]],
  [5, '시설현황', [{ y: 0, h: 80, note: '종이 말림·잎 모서리' }, { y: -120, h: 110, x: 330, w: 370, note: '잎 모서리' }]],
  [66, '교원/반편성', [{ y: 0, h: 120, note: '코르크판 틀·빨간 책갈피' }]],
  [65, '표준보육과정', [{ y: 0, h: 230, note: '제목 띠·하트·아이들·집' }, { y: -150, h: 140, note: '나무·꽃·노란 버스' }]],
  [8, '누리과정', [{ y: 0, h: 220, note: '무지개·바람개비·아이들·새' }]],
  [62, '숲유치원', [{ y: 0, h: 300, note: '나뭇잎 틀·숲' }, { y: -150, h: 140, note: '풀밭·꽃' }]],
  [58, '텃밭', [{ y: 0, h: 110, note: '제목·흙·새싹' }, { y: -280, h: 270, note: '물뿌리개·사과나무·당근' }]],
  [52, '휘트니스', [{ y: 0, h: 290, note: '체크 천·데이지·나무 결' }]],
  [56, '세시풍속', [{ y: 0, h: 170, note: '금색 전통 틀·학' }]],
  [57, '바깥호흡 산책', [{ y: 0, h: 110, note: '풍선 글자 제목' }]],
  [60, '창의 교구', [{ y: 0, h: 230, note: '하늘 띠·새·바늘땀 테두리' }]],
  [32, '행복 프로젝트', [{ y: 0, h: 170, note: '무지개 글자·하트' }]],
  [31, '나사 크레카', [{ y: 0, h: 140, note: '장난감 기차' }]],
  [61, '이야기 동화', [{ y: 0, h: 170, note: '찢긴 종이 말림' }, { y: 250, h: 230, note: '수채 번짐·책 읽는 아이·악어' }]],
  [63, '독서코칭', [{ y: 0, h: 150, note: '하트 풍선·날아가는 아이' }, { y: -140, h: 130, note: '집·나무·풀밭' }]],
  [10, '특별활동', [{ y: 0, h: 300, note: '분홍 격자 틀·아이들' }]],
  [47, '신입원아 적응', [{ y: 0, h: 140, note: '하늘 띠·리본 제목' }, { y: 200, h: 230, x: 400, w: 300, note: '나무·병아리·말풍선' }]],
  [67, '약도(오시는길)', [{ y: -130, h: 120, note: '작은 마을 언덕·나무·집' }]],
  [11, '행사/체험', [{ y: 30, h: 170, note: '구름 언덕·해·집(인사말과 같은 틀)' }]],
]

const COL_W = 700
const TILE_W = 520
const GAP = 14
const HEAD = 30

async function sourceOf(code) {
  if (code === 'frame') return { file: `${OLD}old_65.png`, left: 0, top: 0, height: 900, width: 1440 }
  const pm = `${PM}${code}@1x.webp`
  if (existsSync(pm)) { const m = await sharp(pm).metadata(); return { file: pm, left: 0, top: 0, height: m.height, width: COL_W } }
  const o = `${OLD}old_${code}.png`
  const m = await sharp(o).metadata()
  return { file: o, left: 491, top: 328, height: m.height - 328 - 150, width: COL_W }
}

const label = (text, w, bg = '#2f3b2f') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${HEAD}"><rect width="100%" height="100%" fill="${bg}"/><text x="10" y="21" font-size="16" fill="#fff" font-family="Malgun Gothic, sans-serif">${text.replace(/&/g, '&amp;')}</text></svg>`)

const tiles = []
for (const [code, name, crops] of CROPS) {
  const s = await sourceOf(code)
  for (const c of crops) {
    const x = s.left + (c.x ?? 0)
    const w = c.w ?? (c.frame ? c.w : COL_W)
    const y = c.frame ? c.y : s.top + (c.y >= 0 ? c.y : s.height + c.y)
    const buf = await sharp(s.file).extract({ left: x, top: y, width: w, height: c.h }).resize({ width: TILE_W, height: Math.round((c.h * TILE_W) / w) > 260 ? 260 : undefined, fit: 'inside' }).png().toBuffer()
    const m = await sharp(buf).metadata()
    const tile = await sharp({ create: { width: TILE_W, height: HEAD + m.height, channels: 3, background: '#f4f4f4' } })
      .composite([{ input: label(`${code === 'frame' ? '공통' : code} ${name} — ${c.note}`, TILE_W), left: 0, top: 0 }, { input: buf, left: Math.round((TILE_W - m.width) / 2), top: HEAD }])
      .png().toBuffer()
    tiles.push({ buf: tile, h: HEAD + m.height })
  }
}
// 4열 석조(masonry) 배치
const COLS = 4
const colH = Array(COLS).fill(GAP + 60)
const comps = []
for (const t of tiles) {
  const i = colH.indexOf(Math.min(...colH))
  comps.push({ input: t.buf, left: GAP + i * (TILE_W + GAP), top: colH[i] })
  colH[i] += t.h + GAP
}
const W = COLS * TILE_W + (COLS + 1) * GAP
const H = Math.max(...colH)
const title = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="56"><text x="${GAP}" y="38" font-size="26" font-weight="700" fill="#2f3b2f" font-family="Malgun Gothic, sans-serif">옛 jaramk.com 장식 참고 시트 — 위치·분위기 참고용 (그림 복사·트레이싱 금지)</text></svg>`)
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite([{ input: title, left: 0, top: 4 }, ...comps]).png().toFile(OUT)
console.log('saved', OUT, W, H, tiles.length, 'tiles')
