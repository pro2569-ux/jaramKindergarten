#!/usr/bin/env node
/**
 * 자람동산 마스코트 시안 3종 × 4동작 (적용 전 — 원장님 선택용). 직접 설계한 평면 파스텔 도형.
 *   node scripts/deco/mascots.mjs --out <폴더>
 * 결과: <폴더>/<캐릭터>-<동작>.svg 12장 + mascot-compare.png (한 장 비교)
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { C, star, heart, openBook } from './shapes.mjs'

const args = process.argv.slice(2)
const OUT = path.resolve(args[args.indexOf('--out') + 1] || 'mascots')
mkdirSync(OUT, { recursive: true })

const eyes = (lx, rx, y, mode = 'dot', r = 5) => {
  if (mode === 'happy') return `<g fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"><path d="M${lx - 6} ${y + 2} Q${lx} ${y - 5} ${lx + 6} ${y + 2}"/><path d="M${rx - 6} ${y + 2} Q${rx} ${y - 5} ${rx + 6} ${y + 2}"/></g>`
  if (mode === 'closed') return `<g fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"><path d="M${lx - 6} ${y} Q${lx} ${y + 5} ${lx + 6} ${y}"/><path d="M${rx - 6} ${y} Q${rx} ${y + 5} ${rx + 6} ${y}"/></g>`
  return `<g fill="${C.ink}"><ellipse cx="${lx}" cy="${y}" rx="${r * 0.85}" ry="${r}"/><ellipse cx="${rx}" cy="${y}" rx="${r * 0.85}" ry="${r}"/></g><g fill="#fff"><circle cx="${lx + 1.6}" cy="${y - 1.8}" r="1.6"/><circle cx="${rx + 1.6}" cy="${y - 1.8}" r="1.6"/></g>`
}
const cheeks = (lx, rx, y) => `<g fill="${C.coral}" opacity=".45"><ellipse cx="${lx}" cy="${y}" rx="7" ry="4.5"/><ellipse cx="${rx}" cy="${y}" rx="7" ry="4.5"/></g>`
const mouth = (x, y, mode = 'smile') =>
  mode === 'open'
    ? `<path d="M${x - 7} ${y - 2} Q${x} ${y + 10} ${x + 7} ${y - 2} Z" fill="${C.rose}"/>`
    : mode === 'o'
      ? `<ellipse cx="${x}" cy="${y + 2}" rx="4" ry="5" fill="${C.rose}"/>`
      : `<path d="M${x - 6} ${y} Q${x} ${y + 6} ${x + 6} ${y}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
const shadow = (y = 206, w = 46) => `<ellipse cx="100" cy="${y}" rx="${w}" ry="7" fill="#000" opacity=".06"/>`
const doc = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="200" height="220">${body}</svg>\n`

// ---------------------------------------------------------------- A. 새싹 "자람이"
function jarami(pose) {
  const lift = pose === 'cheer' ? -10 : 0
  const body = C.g2, belly = C.g5
  const arm = (side, up) => {
    const x = side < 0 ? 58 : 142
    if (up) return `<ellipse cx="${x + side * 6}" cy="${104 + lift}" rx="9" ry="20" transform="rotate(${side * 35} ${x + side * 6} ${104 + lift})" fill="${body}"/>`
    return `<ellipse cx="${x}" cy="${146 + lift}" rx="9" ry="17" transform="rotate(${side * -20} ${x} ${146 + lift})" fill="${body}"/>`
  }
  const armL = pose === 'cheer' ? arm(-1, true) : pose === 'read' ? '' : arm(-1, false)
  const armR = pose === 'cheer' || pose === 'wave' ? arm(1, true) : pose === 'read' ? '' : arm(1, false)
  const face = pose === 'cheer' ? eyes(84, 116, 126 + lift, 'happy') + mouth(100, 142 + lift, 'open') : pose === 'read' ? eyes(84, 116, 128, 'closed') + mouth(100, 144, 'smile') : eyes(84, 116, 126 + lift) + mouth(100, 142 + lift, pose === 'wave' ? 'open' : 'smile')
  return [
    shadow(),
    `<g transform="translate(0 ${lift})">`,
    `<ellipse cx="84" cy="196" rx="14" ry="9" fill="${C.g1}"/><ellipse cx="116" cy="196" rx="14" ry="9" fill="${C.g1}"/>`,
    `<path d="M100 72 C140 72 150 112 150 148 C150 180 128 196 100 196 C72 196 50 180 50 148 C50 112 60 72 100 72 Z" fill="${body}"/>`,
    `<ellipse cx="100" cy="164" rx="30" ry="24" fill="${belly}"/>`,
    `<path d="M98 76 L98 50 C98 46 102 46 102 50 L102 76 Z" fill="${C.g3}"/>`,
    `<path d="M100 54 C92 34 70 30 62 42 C72 56 88 58 100 54 Z" fill="${C.g1}"/>`,
    `<path d="M100 50 C108 26 134 22 142 36 C132 52 114 54 100 50 Z" fill="${C.g2}"/><path d="M104 48 C114 38 126 34 136 36" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/>`,
    `</g>`,
    armL, armR,
    `<g>${face}${cheeks(76, 124, 138 + (pose === 'read' ? 2 : lift))}</g>`,
    pose === 'wave' ? `<g fill="none" stroke="${C.yellow}" stroke-width="3" stroke-linecap="round"><path d="M168 68 Q174 74 170 82"/><path d="M178 62 Q186 72 180 84"/></g>` : '',
    pose === 'cheer' ? star(40, 60, 1, C.yellow) + star(166, 50, 0.8, C.pink) + star(160, 92, 0.55, C.sky) : '',
    pose === 'read' ? `${openBook(100, 158, 1.05)}<ellipse cx="62" cy="156" rx="9" ry="12" fill="${C.g2}"/><ellipse cx="138" cy="156" rx="9" ry="12" fill="${C.g2}"/>` : '',
  ].join('')
}

// ---------------------------------------------------------------- B. 언덕 "동산이"
function dongsani(pose) {
  const body = C.g4, top = C.g2
  const lift = pose === 'cheer' ? -14 : 0
  const face = pose === 'sleep' ? eyes(82, 118, 142, 'closed') + mouth(100, 158, 'o') : pose === 'cheer' ? eyes(82, 118, 140 + lift, 'happy') + mouth(100, 156 + lift, 'open') : eyes(82, 118, 140 + lift, 'dot', 5.5) + mouth(100, 156 + lift, pose === 'wave' ? 'open' : 'smile')
  const flowerTop = (x, y) => { let p = ''; for (let i = 0; i < 5; i++) { const a = (i * 72 * Math.PI) / 180; p += `<circle cx="${(x + Math.sin(a) * 8).toFixed(1)}" cy="${(y - Math.cos(a) * 8).toFixed(1)}" r="7"/>` } return `<rect x="${x - 2}" y="${y}" width="4" height="18" rx="2" fill="${C.g3}"/><g fill="${C.pink}">${p}</g><circle cx="${x}" cy="${y}" r="5.5" fill="${C.yellow}"/>` }
  return [
    shadow(206, 70),
    `<g transform="translate(0 ${lift})">`,
    `<ellipse cx="70" cy="200" rx="16" ry="8" fill="${C.g1}"/><ellipse cx="130" cy="200" rx="16" ry="8" fill="${C.g1}"/>`,
    `<path d="M24 196 C24 130 56 96 100 96 C144 96 176 130 176 196 C176 200 172 202 168 202 L32 202 C28 202 24 200 24 196 Z" fill="${body}"/>`,
    `<path d="M40 150 C46 120 70 100 100 100 C130 100 154 120 160 150 C140 134 120 128 100 128 C80 128 60 134 40 150 Z" fill="${top}"/>`,
    `<g fill="#fff" opacity=".55"><circle cx="58" cy="176" r="3"/><circle cx="148" cy="182" r="2.6"/><circle cx="126" cy="190" r="2"/></g>`,
    flowerTop(100, 86),
    face, cheeks(70, 130, 154 + (pose === 'sleep' ? 0 : lift)),
    `</g>`,
    pose === 'wave' ? `<path d="M176 150 C190 136 196 120 190 108 C184 112 180 126 170 138 Z" fill="${top}"/><g fill="none" stroke="${C.yellow}" stroke-width="3" stroke-linecap="round"><path d="M188 92 Q196 98 192 106"/></g>` : '',
    pose === 'sleep' ? `<g fill="${C.sky}" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700"><text x="146" y="92" font-size="20">Z</text><text x="164" y="72" font-size="15">z</text><text x="176" y="56" font-size="11">z</text></g><path d="M34 50 A16 16 0 1 0 50 72 A12 12 0 1 1 34 50 Z" fill="${C.yellow}"/>` : '',
    pose === 'cheer' ? heart(40, 70, 1, C.pink) + heart(162, 62, 0.8, C.rose) + `<g fill="none" stroke="${C.g1}" stroke-width="3" stroke-linecap="round"><path d="M70 214 L64 220"/><path d="M130 214 L136 220"/></g>` : '',
  ].join('')
}

// ---------------------------------------------------------------- C. 아기새 "짹짹이"
function jjaek(pose) {
  const body = C.yellow, belly = C.yellow3, wing = C.yellow2
  const lift = pose === 'fly' ? -22 : 0
  const face = pose === 'sing' ? eyes(86, 114, 112, 'happy') : pose === 'fly' ? eyes(86, 114, 110 + lift, 'dot', 5) : eyes(86, 114, 112, 'dot', 5.5)
  const beak = pose === 'sing' ? `<path d="M92 126 L108 126 L100 136 Z" fill="${C.orange}"/><path d="M93 124 L107 124 L100 118 Z" fill="${C.orange}"/>` : `<path d="M92 124 L108 124 L100 134 Z" fill="${C.orange}"/>`
  const wingL = pose === 'wave' || pose === 'fly' ? `<path d="M52 132 C30 118 22 96 30 84 C44 96 52 112 62 124 Z" fill="${wing}"/>` : `<ellipse cx="52" cy="148" rx="12" ry="22" transform="rotate(20 52 148)" fill="${wing}"/>`
  const wingR = pose === 'fly' ? `<path d="M148 132 C170 118 178 96 170 84 C156 96 148 112 138 124 Z" fill="${wing}"/>` : `<ellipse cx="148" cy="148" rx="12" ry="22" transform="rotate(-20 148 148)" fill="${wing}"/>`
  return [
    shadow(206, pose === 'fly' ? 30 : 44),
    `<g transform="translate(0 ${lift})">`,
    pose === 'fly' ? '' : `<g fill="${C.orange}"><path d="M84 190 L80 204 L88 204 Z"/><path d="M116 190 L112 204 L120 204 Z"/></g>`,
    `<circle cx="100" cy="136" r="56" fill="${body}"/>`,
    `<ellipse cx="100" cy="158" rx="34" ry="28" fill="${belly}"/>`,
    `<path d="M96 82 C90 66 96 58 102 62 C104 54 114 56 110 70 C116 66 122 72 112 82 Z" fill="${C.orange}" opacity=".85"/>`,
    wingL, wingR, face, beak, cheeks(76, 124, 126),
    pose === 'fly' ? `<g fill="${C.orange}"><path d="M88 190 L84 200 L92 198 Z"/><path d="M112 190 L108 198 L116 200 Z"/></g>` : '',
    `</g>`,
    pose === 'sing' ? `<g fill="${C.pink}"><circle cx="150" cy="76" r="6"/><rect x="154" y="48" width="3" height="28" rx="1.5"/><path d="M154 48 L166 52 L166 58 L154 54 Z"/></g><g fill="${C.sky}"><circle cx="170" cy="96" r="5"/><rect x="173" y="74" width="2.6" height="22" rx="1.3"/></g><g fill="${C.mint}"><circle cx="40" cy="80" r="5"/><rect x="43" y="58" width="2.6" height="22" rx="1.3"/></g>` : '',
    pose === 'wave' ? `<g fill="none" stroke="${C.sky}" stroke-width="3" stroke-linecap="round"><path d="M22 66 Q14 74 20 84"/><path d="M12 58 Q2 72 10 86"/></g>` : '',
    pose === 'fly' ? `<g fill="${C.sky2}"><circle cx="66" cy="206" r="10"/><circle cx="82" cy="200" r="13"/><circle cx="100" cy="206" r="10"/></g>` : '',
  ].join('')
}

const CHARS = [
  { key: 'jarami', name: 'A. 새싹 "자람이"', desc: '자람동산에서 자라는 새싹 — 이름과 가장 잘 이어짐', fn: jarami, poses: [['base', '기본'], ['wave', '인사'], ['cheer', '신나요'], ['read', '책 읽기']] },
  { key: 'dongsani', name: 'B. 언덕 "동산이"', desc: '동산(언덕) 모양 몸에 꽃 한 송이 — 포근하고 든든한 느낌', fn: dongsani, poses: [['base', '기본'], ['wave', '인사'], ['cheer', '폴짝'], ['sleep', '낮잠']] },
  { key: 'jjaek', name: 'C. 아기새 "짹짹이"', desc: '환영 띠의 작은 새에서 출발 — 밝고 활발한 느낌', fn: jjaek, poses: [['base', '기본'], ['wave', '인사'], ['sing', '노래'], ['fly', '날기']] },
]

const CELL_W = 260, CELL_H = 290, PAD = 30, HEAD = 70
const comps = []
const text = (t, w, size, color = '#333', weight = 400) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 16}"><text x="0" y="${size + 2}" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="Malgun Gothic, sans-serif">${t}</text></svg>`)
const W = PAD * 2 + 280 + CELL_W * 4
let y = PAD
comps.push({ input: text('자람동산 마스코트 시안 (적용 전 · 원장님 선택용)', W - PAD * 2, 30, '#2f3b2f', 700), left: PAD, top: y })
y += 56
comps.push({ input: text('세 방향 모두 같은 규칙: 선 없는 파스텔 면 · 둥근 몸 · 점 눈 + 분홍 볼 · 사이트 색(노랑·분홍·민트·하늘·초록)', W - PAD * 2, 17, '#666'), left: PAD, top: y })
y += 44
for (const c of CHARS) {
  comps.push({ input: await sharp({ create: { width: W - PAD * 2, height: CELL_H + 20, channels: 3, background: '#FBFDF8' } }).png().toBuffer(), left: PAD, top: y })
  comps.push({ input: text(c.name, 270, 22, '#2f3b2f', 700), left: PAD + 16, top: y + 20 })
  const words = c.desc.split(' — ')
  words.forEach((w, i) => comps.push({ input: text(w, 260, 15, '#666'), left: PAD + 16, top: y + 60 + i * 26 }))
  for (let i = 0; i < c.poses.length; i++) {
    const [pk, pl] = c.poses[i]
    const svgStr = doc(c.fn(pk))
    writeFileSync(path.join(OUT, `${c.key}-${pk}.svg`), svgStr)
    const png = await sharp(Buffer.from(svgStr), { density: 144 }).resize(CELL_W - 20, CELL_H - 50, { fit: 'contain', background: '#FBFDF8' }).flatten({ background: '#FBFDF8' }).png().toBuffer()
    const x = PAD + 280 + i * CELL_W
    comps.push({ input: png, left: x, top: y + 10 })
    comps.push({ input: text(pl, 120, 17, '#444', 700), left: x + (CELL_W - 20) / 2 - 20, top: y + CELL_H - 34 })
  }
  y += CELL_H + 40
}
const H = y + HEAD - 40
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(comps).png().toFile(path.join(OUT, 'mascot-compare.png'))
console.log('saved', path.join(OUT, 'mascot-compare.png'), W, H)
