#!/usr/bin/env node
/**
 * 자람동산 장식 SVG 생성기 → public/deco/
 *   node scripts/deco/build-deco.mjs
 * - scene-*.svg   하단 풍경 (1200×200, 가운데 아래 기준으로 잘림 — 모바일에선 가운데만 보임)
 * - corner-*.svg  모서리 장식 (120×120, 오른쪽 위 기준)
 * - icon-*.svg    제목 아이콘 (32×32)
 * - divider-*.svg 구분선 (600×28)
 * - banner-band-*.svg 서브 페이지 환영 띠 (400×200 좌우 반복, 대분류별 색) + banner-deco.svg (해·구름·새)
 * - hill.svg / leaves-corner.svg / sprout.svg  기준 스타일 3종
 * - sun.svg       사이드바 제목용 작은 해
 * 모두 직접 설계한 평면 파스텔 도형(scripts/deco/shapes.mjs). 옛 사이트 그림을 옮기거나 따라 그리지 않았다.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as S from './shapes.mjs'

const { C } = S
const OUT = path.resolve('public/deco')
mkdirSync(OUT, { recursive: true })
const files = {}
const put = (name, content) => { files[name] = content; writeFileSync(path.join(OUT, name), content) }

// ------------------------------------------------------------ 하단 풍경
const W = 1200, H = 200
const ground = (back = C.g5, front = C.g4, phase = 0.6) => S.hill(W, H, 138, 12, 2.2, back, phase) + S.hill(W, H, 168, 7, 3.1, front, phase + 1.4)

const scenes = {
  meadow: () => [
    S.cloud(210, 52, 1.1, C.sky2, 0.85), S.cloud(980, 40, 0.9, C.sky2, 0.85),
    ground(),
    S.roundTree(80, 172, 1.05), S.roundTree(1130, 170, 0.95, C.g4, C.g2),
    S.flower(330, 178, 1.2, C.pink), S.tulip(372, 180, 1.1, C.rose), S.grass(410, 182, 1),
    S.sprout(520, 178, 1.3), S.flower(610, 178, 1.1, C.sky), S.flower(650, 182, 0.9, C.yellow, C.orange), S.grass(700, 184, 1.1),
    S.tulip(820, 180, 1.1, C.purple), S.flower(870, 178, 1.2, C.mint), S.grass(930, 184),
    S.butterfly(560, 108, 0.9, C.pink, C.yellow, -12), S.butterfly(760, 90, 0.7, C.sky, C.mint, 10),
  ],
  letter: () => [
    S.cloud(160, 56, 1, C.sky2, 0.85), S.cloud(1040, 46, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 1.1),
    S.flower(120, 178, 1.2, C.pink), S.tulip(170, 182, 1.1, C.rose), S.grass(210, 184),
    S.flower(400, 180, 1.3, C.yellow, C.orange), S.tulip(445, 182, 1.2, C.pink), S.flower(490, 180, 1.1, C.purple),
    S.envelope(600, 110, 1.35, -8), S.heart(660, 70, 0.7, C.pink), S.heart(540, 60, 0.5, C.rose), S.heart(700, 108, 0.45, C.pink2),
    S.flower(720, 180, 1.2, C.sky), S.tulip(765, 182, 1.2, C.rose), S.flower(810, 180, 1.3, C.pink),
    S.grass(900, 184), S.flower(1020, 178, 1.1, C.mint), S.tulip(1070, 182, 1.1, C.yellow),
  ],
  house: () => [
    S.cloud(260, 44, 1, C.sky2, 0.85), S.cloud(900, 36, 0.8, C.sky2, 0.85),
    ground(C.g5, C.g4, 0.2),
    S.roundTree(90, 172, 1), S.sunflower(170, 180, 1.1), S.sunflower(205, 182, 0.9),
    S.house(470, 176, 1.55, C.cream, C.coral), S.roundTree(575, 176, 0.9, C.g4, C.g2),
    S.slide(700, 178, 1.2), S.swing(830, 178, 1.2),
    S.flower(930, 180, 1.1, C.pink), S.grass(970, 184), S.sunflower(1060, 180, 1), S.roundTree(1140, 172, 0.95, C.g4, C.g2),
    S.butterfly(620, 70, 0.8, C.yellow, C.pink, 8),
  ],
  road: () => [
    S.cloud(200, 48, 1, C.sky2, 0.85), S.cloud(1000, 40, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 2.1),
    `<path d="M0 196 C220 178 380 176 560 182 C760 188 960 176 1200 170 L1200 200 L0 200 Z" fill="${C.soil}"/>`,
    `<g fill="#fff" opacity=".7"><rect x="120" y="186" width="40" height="4" rx="2"/><rect x="330" y="182" width="40" height="4" rx="2"/><rect x="560" y="184" width="40" height="4" rx="2"/><rect x="800" y="182" width="40" height="4" rx="2"/><rect x="1040" y="178" width="40" height="4" rx="2"/></g>`,
    S.roundTree(90, 160, 0.9), S.house(250, 160, 1, C.cream, C.sky), S.signpost(420, 176, 1.25),
    S.bus(640, 184, 1.25),
    S.roundTree(850, 160, 0.95, C.g4, C.g2), S.flower(930, 168, 1, C.pink), S.house(1100, 158, 0.95, C.cream, C.coral),
  ],
  books: () => [
    S.rainbow(600, 150, 118, 1),
    S.cloud(190, 52, 1, C.sky2, 0.85), S.cloud(1010, 44, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 1.6),
    S.roundTree(100, 172, 1), S.flower(210, 180, 1.1, C.pink),
    S.books(420, 180, 1.35), S.pencil(500, 176, 1.25, -18, C.yellow), S.openBook(600, 168, 1.35), S.pencil(700, 176, 1.25, 20, C.sky),
    S.star(520, 88, 0.9, C.yellow), S.star(690, 76, 0.7, C.pink),
    S.flower(820, 180, 1.1, C.mint), S.tulip(870, 182, 1.1, C.rose), S.grass(930, 184), S.roundTree(1120, 172, 0.95, C.g4, C.g2),
  ],
  rainbow: () => [
    S.rainbow(300, 150, 130, 1),
    S.cloud(880, 46, 1, C.sky2, 0.85),
    ground(C.g5, C.g4, 0.9),
    S.pinwheel(130, 178, 1.3), S.pinwheel(520, 178, 1.2),
    S.blocks(610, 180, 1.35), S.ball(700, 182, 1.1),
    S.flower(780, 180, 1.1, C.pink), S.tulip(820, 182, 1.1, C.yellow), S.pinwheel(900, 178, 1.1), S.roundTree(1100, 172, 1),
    S.star(640, 90, 0.8, C.yellow), S.star(1000, 110, 0.6, C.pink),
  ],
  forest: () => [
    S.cloud(620, 38, 0.9, C.sky2, 0.8),
    ground(C.g4, C.g2, 0.3),
    S.tallTree(60, 176, 1.25, C.g1), S.roundTree(130, 176, 1.2), S.tallTree(210, 178, 1, C.g2),
    S.mushroom(290, 184, 1.2, C.coral), S.mushroom(320, 186, 0.8, C.orange), S.grass(360, 186),
    S.roundTree(450, 176, 1.15, C.g2, C.g1), S.tallTree(530, 178, 1.05, C.g1),
    S.mushroom(610, 186, 1.1, C.pink), S.leaf(660, 150, 0.8, 30, C.g2), S.bird(720, 118, 0.9, C.yellow),
    S.tallTree(800, 178, 1.15, C.g2), S.roundTree(880, 176, 1.2, C.g2, C.g1), S.mushroom(950, 186, 1, C.coral),
    S.tallTree(1040, 178, 1.2, C.g1), S.roundTree(1130, 176, 1.1),
  ],
  garden: () => [
    S.cloud(240, 46, 1, C.sky2, 0.85), S.cloud(980, 40, 0.8, C.sky2, 0.85),
    ground(C.g5, C.g4, 1.3),
    `<g fill="${C.soil}"><rect x="300" y="170" width="620" height="22" rx="11"/></g>`,
    S.roundTree(100, 172, 1.05, C.g2, C.g1), `<g>${[0, 1, 2].map((i) => `<circle cx="${88 + i * 12}" cy="${128 - (i % 2) * 8}" r="4" fill="${C.coral}"/>`).join('')}</g>`,
    S.sprout(340, 176, 1), S.carrot(400, 178, 1.3), S.cabbage(460, 180, 1.2), S.sprout(520, 176, 1.1),
    S.carrot(580, 178, 1.2), S.cabbage(640, 180, 1.1), S.sprout(700, 176, 1), S.carrot(760, 178, 1.3), S.sprout(820, 176, 1.1), S.cabbage(880, 180, 1),
    S.wateringCan(1020, 176, 1.3), S.flower(1130, 180, 1, C.yellow, C.orange),
  ],
  play: () => [
    S.cloud(200, 48, 1, C.sky2, 0.85), S.cloud(1000, 40, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 2.4),
    S.roundTree(90, 172, 1), S.flower(190, 180, 1.1, C.pink),
    S.ball(360, 182, 1.4), S.jumpRope(500, 178, 1.3), S.ball(620, 184, 1), S.blocks(720, 182, 1.2),
    `<g><rect x="840" y="118" width="4" height="64" rx="2" fill="${C.brown}"/><path d="M844 120 L884 130 L844 142 Z" fill="${C.pink}"/></g>`,
    S.flower(940, 180, 1.1, C.sky), S.grass(990, 184), S.roundTree(1120, 172, 0.95, C.g4, C.g2),
    S.star(430, 88, 0.7, C.yellow), S.star(780, 76, 0.6, C.pink),
  ],
  festival: () => [
    S.kite(240, 70, 1.1, -14), S.kite(960, 60, 0.9, 12),
    S.cloud(600, 44, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 0.7),
    S.roundTree(90, 172, 1),
    S.pouch(420, 176, 1.3, C.rose), S.pouch(480, 180, 1, C.sky), S.flower(560, 180, 1.1, C.pink),
    S.pinwheel(650, 178, 1.2), S.pouch(740, 178, 1.2, C.mint), S.flower(820, 180, 1.1, C.yellow, C.orange),
    S.grass(900, 184), S.roundTree(1120, 172, 0.95, C.g4, C.g2),
  ],
  breeze: () => [
    S.cloud(180, 52, 1.2, C.sky2, 0.85), S.cloud(560, 36, 0.9, C.sky2, 0.85), S.cloud(1020, 50, 1.1, C.sky2, 0.85),
    S.wind(360, 90, 1.1, C.sky), S.wind(820, 76, 0.9, C.mint),
    ground(C.g5, C.g4, 1.9),
    S.butterfly(480, 110, 1, C.pink, C.yellow, -10), S.butterfly(700, 124, 0.8, C.yellow, C.sky, 12), S.butterfly(950, 100, 0.7, C.mint, C.pink, -6),
    S.grass(120, 184), S.flower(200, 180, 1.1, C.sky), S.tulip(300, 182, 1, C.rose), S.grass(420, 184),
    S.flower(600, 180, 1.2, C.pink), S.grass(660, 184), S.tulip(780, 182, 1.1, C.yellow), S.flower(880, 180, 1.1, C.purple), S.grass(1080, 184), S.flower(1150, 180, 1, C.pink),
  ],
  village: () => [
    S.cloud(300, 44, 1, C.sky2, 0.85), S.cloud(900, 40, 0.9, C.sky2, 0.85),
    ground(C.g5, C.g4, 1.0),
    S.roundTree(80, 172, 0.95), S.house(190, 174, 1.1, C.cream, C.sky), S.roundTree(290, 174, 0.8, C.g4, C.g2),
    S.house(420, 172, 1.3, C.cream, C.coral), S.flower(510, 180, 1, C.pink), S.tallTree(580, 176, 1, C.g2),
    S.house(690, 172, 1.2, C.yellow3, C.mint), S.roundTree(790, 174, 0.9),
    S.house(900, 174, 1.05, C.cream, C.purple), S.flower(980, 180, 1, C.yellow, C.orange), S.roundTree(1100, 172, 1, C.g4, C.g2),
  ],
}
for (const [k, f] of Object.entries(scenes)) put(`scene-${k}.svg`, S.svg(W, H, f().join('')))

// ------------------------------------------------------------ 모서리 (오른쪽 위)
const corners = {
  leaves: [S.leaf(96, 30, 1.3, -120, C.g2), S.leaf(92, 34, 1.1, -160, C.g1), S.leaf(100, 26, 1.05, -80, C.g4), S.sprout(62, 60, 1.1), S.leaf(110, 70, 0.8, -150, C.mint)],
  flowers: [S.flower(94, 58, 1.35, C.pink, C.yellow, false), S.flower(66, 46, 1, C.yellow, C.orange, false), S.flower(104, 88, 0.85, C.sky, C.yellow, false), S.leaf(78, 40, 0.8, -60, C.g2), S.leaf(112, 50, 0.7, 40, C.g4)],
  stars: [S.star(92, 30, 1.5, C.yellow), S.star(60, 22, 0.9, C.pink), S.star(104, 66, 0.8, C.sky), S.star(74, 52, 0.55, C.mint), `<circle cx="46" cy="40" r="3" fill="${C.yellow2}"/><circle cx="110" cy="96" r="2.6" fill="${C.pink2}"/>`],
  hearts: [S.heart(90, 40, 1.6, C.pink), S.heart(58, 30, 0.9, C.rose), S.heart(104, 76, 0.8, C.pink2), S.heart(70, 64, 0.55, C.coral)],
  butterfly: [S.butterfly(84, 40, 1.5, C.yellow, C.pink, 18), S.flower(104, 104, 0.9, C.pink, C.yellow, false), `<circle cx="50" cy="60" r="3" fill="${C.yellow2}"/><circle cx="60" cy="74" r="2" fill="${C.yellow2}"/>`],
  clouds: [S.cloud(78, 40, 1.1, C.sky2), S.cloud(94, 78, 0.7, C.sky3), S.bird(62, 70, 0.8, C.yellow)],
}
for (const [k, parts] of Object.entries(corners)) put(`corner-${k}.svg`, S.svg(120, 120, parts.join(''), { preserve: 'xMaxYMin meet' }))

// ------------------------------------------------------------ 제목 아이콘 (32×32)
const icons = {
  sprout: S.sprout(16, 30, 1.05), leaf: S.leaf(16, 30, 0.85, 20, C.g1), flower: S.flower(16, 44, 1.05, C.pink, C.yellow, false),
  sun: S.sun(16, 16, 8.5), book: S.books(16, 26, 0.52), pencil: S.pencil(18, 22, 0.62, 35, C.yellow),
  tree: S.roundTree(16, 31, 0.36), heart: S.heart(16, 20, 0.95, C.pink), star: S.star(16, 17, 1.1, C.yellow),
  house: S.house(16, 30, 0.42, C.cream, C.coral), bus: S.bus(16, 25, 0.33), ball: S.ball(16, 30, 0.95),
  kite: S.kite(16, 13, 0.3, -12), butterfly: S.butterfly(16, 16, 0.85, C.pink, C.yellow), letter: S.envelope(16, 16, 0.55, -6),
  mushroom: S.mushroom(16, 30, 0.95, C.coral), carrot: S.carrot(16, 25, 0.95), cloud: S.cloud(16, 18, 0.42, C.sky),
}
for (const [k, body] of Object.entries(icons)) put(`icon-${k}.svg`, S.svg(32, 32, body, { preserve: 'xMidYMid meet' }))

// ------------------------------------------------------------ 구분선 (600×28)
const vine = () => {
  let leaves = ''
  for (let i = 0; i < 12; i++) leaves += S.leaf(40 + i * 45, 14 + (i % 2 ? -3 : 3), 0.42, i % 2 ? 50 : 130, i % 3 ? C.g2 : C.g1)
  return `<path d="M20 14 C80 4 120 24 180 14 C240 4 280 24 340 14 C400 4 440 24 500 14 C540 8 560 12 580 14" fill="none" stroke="${C.g4}" stroke-width="3" stroke-linecap="round"/>${leaves}`
}
const dividers = {
  vine: vine(),
  dots: [C.pink, C.yellow, C.mint, C.sky].flatMap((c, j) => [0, 1, 2, 3, 4].map((i) => `<circle cx="${60 + (i * 4 + j) * 24}" cy="14" r="${j % 2 ? 4 : 5.5}" fill="${c}"/>`)).join(''),
  clouds: [80, 200, 320, 440, 540].map((x, i) => S.cloud(x, 16, 0.38, i % 2 ? C.sky2 : C.mint2)).join(''),
  flowers: [60, 150, 240, 330, 420, 510].map((x, i) => S.flower(x, 34, 0.8, [C.pink, C.yellow, C.sky, C.mint, C.purple, C.rose][i], C.yellow, false)).join(''),
}
for (const [k, body] of Object.entries(dividers)) put(`divider-${k}.svg`, S.svg(600, 28, body, { preserve: 'xMidYMid meet' }))

// ------------------------------------------------------------ 서브 페이지 환영 띠 (1440×200)
const BANNER = {
  yellow: ['#FFF4C9', '#FFE58A'],
  green: ['#E3F4CF', '#BFE39E'],
  pink: ['#FFE6EF', '#FFC7DA'],
  sky: ['#E4F2FC', '#BCDDF6'],
  mint: ['#DEF5EA', '#B2E4CC'],
}
// 두 겹: (1) banner-band-<색>.svg 400×200 — 좌우로 이어 붙는 띠(그라데이션·점무늬·아래 구름 물결)
//        (2) banner-deco.svg 1200×200 — 해·구름·새 (한 번만, 본문 컨테이너 기준으로 놓임)
const TILE = 400
const scallopCircles = () => {
  // 200px 주기(원 4개) — 타일 경계에서 이어지도록 앞뒤 복사본까지
  const base = [[22, 30], [72, 36], [126, 27], [172, 34]]
  let s = ''
  for (let off = -TILE; off <= TILE; off += 200) for (const [cx, r] of base) s += `<circle cx="${cx + off}" cy="150" r="${r}"/>`
  return s
}
for (const [k, [c1, c2]] of Object.entries(BANNER)) {
  const body = [
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><clipPath id="band"><rect x="0" y="0" width="${TILE}" height="150"/>${scallopCircles()}</clipPath></defs>`,
    `<g clip-path="url(#band)"><rect width="${TILE}" height="200" fill="url(#g)"/>${S.dots(TILE, 200, '#FFFFFF', 20, 2.1, 0.5)}</g>`,
  ].join('')
  put(`banner-band-${k}.svg`, S.svg(TILE, 200, body, { preserve: 'none' }))
}
put('banner-deco.svg', S.svg(1200, 200, [
  S.sun(96, 64, 27, true),
  S.cloud(250, 40, 0.85, '#fff', 0.95),
  S.cloud(400, 112, 0.8, '#fff', 0.98), S.bird(404, 92, 0.85, C.yellow),
  S.cloud(620, 30, 0.55, '#fff', 0.85), S.cloud(1110, 44, 0.75, '#fff', 0.9),
].join(''), { preserve: 'xMinYMin meet' }))

// ------------------------------------------------------------ 기준 3종 + 작은 해
put('hill.svg', S.svg(W, H, ground()))
put('leaves-corner.svg', files['corner-leaves.svg'])
put('sprout.svg', S.svg(64, 64, S.sprout(32, 60, 2.1), { preserve: 'xMidYMid meet' }))
put('sun.svg', S.svg(64, 64, S.sun(32, 32, 16, true), { preserve: 'xMidYMid meet' }))

console.log(`public/deco: ${Object.keys(files).length}개 생성`)
console.log(Object.keys(files).join(' '))
