#!/usr/bin/env node
/**
 * public/deco 의 그림 세트를 한 장으로 모아 보기 (원장님 보고·점검용).
 *   node scripts/deco/preview-sheet.mjs --out <png>
 */
import sharp from 'sharp'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const OUT = args[args.indexOf('--out') + 1] || 'deco-preview.png'
const DIR = path.resolve('public/deco')
const all = readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort()
const names = {
  meadow: '들판(기본)', letter: '꽃과 편지 · 인사말', house: '집과 놀이터 · 교육환경/시설', road: '길·버스·이정표 · 약도',
  books: '책·연필·무지개 · 표준보육', rainbow: '무지개·바람개비 · 누리/창의', forest: '나무와 버섯 · 숲유치원', garden: '새싹·물뿌리개·채소 · 텃밭',
  play: '공·줄넘기 · 휘트니스/특별활동', festival: '연·복주머니 · 세시풍속', breeze: '구름·바람·나비 · 바깥호흡', village: '작은 마을 · 교원/행사',
}
const label = (text, w, size = 18, color = '#333') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 14}"><text x="4" y="${size + 2}" font-size="${size}" fill="${color}" font-family="Malgun Gothic, sans-serif">${text}</text></svg>`)
const render = (file, w, h, bg = '#ffffff') => sharp(readFileSync(path.join(DIR, file)), { density: 144 }).resize(w, h, { fit: 'contain', background: bg }).flatten({ background: bg }).png().toBuffer()

const PAD = 24, SW = 880, SH = Math.round(SW / 6)
const comps = []
let y = PAD
comps.push({ input: label('자람동산 장식 그림 세트 (새로 그린 SVG — 선 없는 파스텔 면)', 1780, 28, '#2f3b2f'), left: PAD, top: y }); y += 56

comps.push({ input: label('하단 풍경 (본문 카드 맨 아래 · 모바일은 가운데 부분만 보임)', 1780, 20, '#5a6b4a'), left: PAD, top: y }); y += 40
const scenes = all.filter((f) => f.startsWith('scene-'))
for (let i = 0; i < scenes.length; i++) {
  const col = i % 2, row = Math.floor(i / 2)
  const x = PAD + col * (SW + PAD), yy = y + row * (SH + 40)
  const key = scenes[i].replace('scene-', '').replace('.svg', '')
  comps.push({ input: label(`deco-scene--${key}  ${names[key] ?? ''}`, SW, 16), left: x, top: yy })
  comps.push({ input: await render(scenes[i], SW, SH, '#fbfdf8'), left: x, top: yy + 28 })
}
y += Math.ceil(scenes.length / 2) * (SH + 40) + 16

comps.push({ input: label('환영 띠 (서브 페이지 상단 · 대분류별 색: 어린이집소개 노랑 / 교육프로그램 초록 / 입학안내 분홍 / 교육활동이야기 하늘 / 커뮤니티 민트)', 1780, 20, '#5a6b4a'), left: PAD, top: y }); y += 40
const banners = ['banner-band-yellow.svg', 'banner-band-green.svg', 'banner-band-pink.svg', 'banner-band-sky.svg', 'banner-band-mint.svg']
for (let i = 0; i < banners.length; i++) {
  const col = i % 2, row = Math.floor(i / 2)
  comps.push({ input: await render(banners[i], SW, Math.round(SW / 7.2), '#ffffff'), left: PAD + col * (SW + PAD), top: y + row * (Math.round(SW / 7.2) + 20) })
}
y += 3 * (Math.round(SW / 7.2) + 20) + 16

comps.push({ input: label('모서리 장식 (deco-corner--*)', 900, 20, '#5a6b4a'), left: PAD, top: y })
comps.push({ input: label('기준 3종 + 사이드바 해', 900, 20, '#5a6b4a'), left: PAD + SW + PAD, top: y }); y += 40
const corners = all.filter((f) => f.startsWith('corner-'))
corners.forEach((f, i) => {})
for (let i = 0; i < corners.length; i++) {
  comps.push({ input: await render(corners[i], 130, 130, '#fbfdf8'), left: PAD + i * 145, top: y })
  comps.push({ input: label(corners[i].replace('corner-', '').replace('.svg', ''), 140, 14), left: PAD + i * 145, top: y + 134 })
}
const base = ['hill.svg', 'leaves-corner.svg', 'sprout.svg', 'sun.svg']
comps.push({ input: await render(base[0], 390, 65, '#fbfdf8'), left: PAD + SW + PAD, top: y + 30 })
for (let i = 1; i < base.length; i++) comps.push({ input: await render(base[i], 110, 110, '#fbfdf8'), left: PAD + SW + PAD + 400 + (i - 1) * 125, top: y })
y += 180

comps.push({ input: label('제목 아이콘 (h2 에 t-* 클래스) — 실제 크기의 3배', 1780, 20, '#5a6b4a'), left: PAD, top: y }); y += 40
const icons = all.filter((f) => f.startsWith('icon-'))
for (let i = 0; i < icons.length; i++) {
  comps.push({ input: await render(icons[i], 96, 96, '#fbfdf8'), left: PAD + i * 100, top: y })
  comps.push({ input: label(icons[i].replace('icon-', '').replace('.svg', ''), 100, 13), left: PAD + i * 100, top: y + 98 })
}
y += 140

comps.push({ input: label('구분선 (hr.deco-divider--*)', 1780, 20, '#5a6b4a'), left: PAD, top: y }); y += 40
const divs = all.filter((f) => f.startsWith('divider-'))
for (let i = 0; i < divs.length; i++) {
  comps.push({ input: await render(divs[i], 860, 40, '#fbfdf8'), left: PAD + (i % 2) * (SW + PAD), top: y + Math.floor(i / 2) * 70 })
  comps.push({ input: label(divs[i].replace('divider-', '').replace('.svg', ''), 200, 13), left: PAD + (i % 2) * (SW + PAD), top: y + Math.floor(i / 2) * 70 + 42 })
}
y += 150

const WIDTH = PAD * 3 + SW * 2
await sharp({ create: { width: WIDTH, height: y, channels: 3, background: '#ffffff' } }).composite(comps).png().toFile(OUT)
console.log('saved', OUT, WIDTH, y)
