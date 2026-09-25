/**
 * 자람동산 장식 그림 기본 도형 (직접 설계한 평면 파스텔 도형 — 옛 사이트 그림을 옮기지 않음).
 * 규칙: 윤곽선 없이 면으로만, 부드러운 곡선, 사이트 색(노랑·분홍·민트·하늘 + 초록 계열).
 * 모든 함수는 SVG 조각 문자열을 돌려준다. (x, y) 는 도형의 바닥 가운데 기준(나무·꽃·집 등) 또는 중심(구름·해·별 등).
 */
export const C = {
  yellow: '#FFDD57', yellow2: '#FFE993', yellow3: '#FFF4C7',
  pink: '#FFADCB', pink2: '#FFCFE0', rose: '#FF8FA3',
  mint: '#9FDCC4', mint2: '#C9EEDD',
  sky: '#A9D6F5', sky2: '#D2EAFB', sky3: '#EAF5FD',
  g1: '#7CC474', g2: '#9BD68A', g3: '#5FAF5E', g4: '#C7E8B2', g5: '#E2F3D4',
  brown: '#C69A6D', brown2: '#E4C49F', soil: '#E9D2B0',
  orange: '#FFB36B', coral: '#FF9C84', purple: '#C6B4F2', lilac: '#E2D8FA',
  white: '#FFFFFF', cream: '#FFF8E4', ink: '#6B5B4B',
}

const t = (x, y, s = 1, r = 0) => `translate(${x} ${y})${r ? ` rotate(${r})` : ''}${s !== 1 ? ` scale(${s})` : ''}`

export function svg(w, h, body, { preserve = 'xMidYMax slice', title } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="${preserve}" aria-hidden="true">${title ? `<!-- ${title} -->` : ''}${body}</svg>\n`
}

/** 부드러운 언덕 띠: y 기준선, amp 높이, waves 개수, phase 위상 */
export function hill(w, h, y, amp, waves, color, phase = 0) {
  // 사인 곡선 위 점들을 중점 이차곡선으로 이어 부드러운 언덕선
  const N = 40
  const pts = []
  for (let i = 0; i <= N; i++) {
    const x = (w * i) / N
    pts.push([x, y + amp * Math.sin(phase + (2 * Math.PI * waves * x) / w) + amp * 0.35 * Math.sin(phase * 1.7 + (2 * Math.PI * waves * 2.3 * x) / w)])
  }
  let d = `M0 ${h} L${pts[0][0]} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < N; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  d += ` L${w} ${pts[N][1].toFixed(1)} L${w} ${h} Z`
  return `<path d="${d}" fill="${color}"/>`
}

export const cloud = (x, y, s = 1, fill = C.white, o = 1) =>
  `<g transform="${t(x, y, s)}" fill="${fill}"${o < 1 ? ` opacity="${o}"` : ''}><circle cx="-18" cy="0" r="13"/><circle cx="0" cy="-8" r="18"/><circle cx="19" cy="-1" r="14"/><rect x="-31" y="-2" width="64" height="15" rx="7.5"/></g>`

export function sun(x, y, r = 22, face = false) {
  let rays = ''
  for (let i = 0; i < 10; i++) rays += `<rect x="-3.2" y="${-(r + 13)}" width="6.4" height="10" rx="3.2" transform="rotate(${i * 36})"/>`
  return `<g transform="${t(x, y)}"><g fill="${C.yellow2}">${rays}</g><circle r="${r}" fill="${C.yellow}"/>${face ? `<circle cx="${-r * 0.45}" cy="${r * 0.12}" r="${r * 0.14}" fill="${C.coral}" opacity=".55"/><circle cx="${r * 0.45}" cy="${r * 0.12}" r="${r * 0.14}" fill="${C.coral}" opacity=".55"/>` : ''}</g>`
}

export const roundTree = (x, y, s = 1, leaf = C.g2, leaf2 = C.g1) =>
  `<g transform="${t(x, y, s)}"><rect x="-4.5" y="-34" width="9" height="34" rx="4.5" fill="${C.brown}"/><circle cx="0" cy="-52" r="24" fill="${leaf}"/><circle cx="-15" cy="-40" r="15" fill="${leaf2}"/><circle cx="14" cy="-42" r="16" fill="${leaf2}"/><circle cx="-6" cy="-60" r="9" fill="#fff" opacity=".25"/></g>`

export const tallTree = (x, y, s = 1, leaf = C.g1) =>
  `<g transform="${t(x, y, s)}"><rect x="-4" y="-26" width="8" height="26" rx="4" fill="${C.brown}"/><path d="M0 -92 C14 -72 26 -52 24 -34 C22 -22 -22 -22 -24 -34 C-26 -52 -14 -72 0 -92 Z" fill="${leaf}"/><path d="M0 -80 C6 -66 10 -52 8 -40" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/></g>`

export function flower(x, y, s = 1, petal = C.pink, center = C.yellow, stem = true) {
  let p = ''
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180
    p += `<circle cx="${(Math.sin(a) * 7).toFixed(1)}" cy="${(-26 - Math.cos(a) * 7).toFixed(1)}" r="6"/>`
  }
  return `<g transform="${t(x, y, s)}">${stem ? `<rect x="-1.8" y="-24" width="3.6" height="24" rx="1.8" fill="${C.g1}"/><ellipse cx="6" cy="-10" rx="6" ry="3" transform="rotate(-30 6 -10)" fill="${C.g2}"/>` : ''}<g fill="${petal}">${p}</g><circle cx="0" cy="-26" r="4.5" fill="${center}"/></g>`
}

export const tulip = (x, y, s = 1, color = C.rose) =>
  `<g transform="${t(x, y, s)}"><rect x="-1.8" y="-26" width="3.6" height="26" rx="1.8" fill="${C.g1}"/><ellipse cx="-6" cy="-9" rx="7" ry="3.2" transform="rotate(35 -6 -9)" fill="${C.g2}"/><path d="M-9 -38 L-9 -30 C-9 -24 9 -24 9 -30 L9 -38 L4.5 -33 L0 -39 L-4.5 -33 Z" fill="${color}"/></g>`

export const sunflower = (x, y, s = 1) => {
  let p = ''
  for (let i = 0; i < 12; i++) p += `<ellipse cx="0" cy="-12" rx="4" ry="8" transform="rotate(${i * 30})"/>`
  return `<g transform="${t(x, y, s)}"><rect x="-2" y="-42" width="4" height="42" rx="2" fill="${C.g1}"/><ellipse cx="-8" cy="-18" rx="8" ry="3.6" transform="rotate(25 -8 -18)" fill="${C.g2}"/><g transform="translate(0 -44)"><g fill="${C.yellow}">${p}</g><circle r="7.5" fill="${C.brown}"/></g></g>`
}

export const sprout = (x, y, s = 1, c1 = C.g2, c2 = C.g1) =>
  `<g transform="${t(x, y, s)}"><path d="M-1.8 0 L-1.8 -18 C-1.8 -21 1.8 -21 1.8 -18 L1.8 0 Z" fill="${C.g3}"/><path d="M0 -17 C-4 -30 -18 -32 -22 -24 C-16 -16 -6 -15 0 -17 Z" fill="${c1}"/><path d="M0 -19 C4 -34 20 -37 25 -28 C18 -19 7 -17 0 -19 Z" fill="${c2}"/></g>`

export const grass = (x, y, s = 1, c = C.g1) =>
  `<g transform="${t(x, y, s)}" fill="${c}"><path d="M-9 0 C-9 -8 -12 -14 -15 -17 C-8 -14 -5 -8 -4 0 Z"/><path d="M-3 0 C-3 -10 -1 -18 1 -22 C3 -16 4 -8 3 0 Z"/><path d="M4 0 C5 -7 8 -13 13 -15 C10 -10 9 -5 9 0 Z"/></g>`

export const house = (x, y, s = 1, wall = C.cream, roof = C.coral, door = C.brown2) =>
  `<g transform="${t(x, y, s)}"><rect x="-26" y="-40" width="52" height="40" rx="3" fill="${wall}"/><path d="M-33 -38 L0 -66 L33 -38 C35 -36 33 -33 30 -33 L-30 -33 C-33 -33 -35 -36 -33 -38 Z" fill="${roof}"/><rect x="-7" y="-22" width="14" height="22" rx="7" fill="${door}"/><rect x="-21" y="-28" width="10" height="10" rx="2.5" fill="${C.sky}"/><rect x="11" y="-28" width="10" height="10" rx="2.5" fill="${C.sky}"/><rect x="12" y="-66" width="8" height="14" rx="2" fill="${roof}"/></g>`

export const slide = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-22" y="-52" width="6" height="52" rx="3" fill="${C.sky}"/><rect x="-6" y="-52" width="6" height="52" rx="3" fill="${C.sky}"/><rect x="-22" y="-54" width="22" height="7" rx="3.5" fill="${C.yellow}"/><path d="M-2 -50 C14 -44 20 -18 38 -4 C42 0 40 3 35 3 L30 3 C18 -10 10 -34 -4 -42 Z" fill="${C.pink}"/><rect x="-20" y="-40" width="16" height="4" rx="2" fill="${C.sky2}"/><rect x="-20" y="-26" width="16" height="4" rx="2" fill="${C.sky2}"/><rect x="-20" y="-12" width="16" height="4" rx="2" fill="${C.sky2}"/></g>`

export const swing = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><path d="M-30 0 L-18 -56 L18 -56 L30 0 L24 0 L14 -50 L-14 -50 L-24 0 Z" fill="${C.mint}"/><rect x="-5" y="-52" width="2.4" height="34" rx="1.2" fill="${C.brown2}"/><rect x="3" y="-52" width="2.4" height="34" rx="1.2" fill="${C.brown2}"/><rect x="-8" y="-20" width="16" height="5" rx="2.5" fill="${C.orange}"/></g>`

export const mushroom = (x, y, s = 1, cap = C.coral) =>
  `<g transform="${t(x, y, s)}"><path d="M-6 0 C-7 -6 -6 -12 -5 -16 L5 -16 C6 -12 7 -6 6 0 Z" fill="${C.cream}"/><path d="M-17 -14 C-17 -30 17 -30 17 -14 C17 -12 15 -11 13 -11 L-13 -11 C-15 -11 -17 -12 -17 -14 Z" fill="${cap}"/><circle cx="-7" cy="-20" r="2.6" fill="#fff" opacity=".85"/><circle cx="5" cy="-23" r="2" fill="#fff" opacity=".85"/><circle cx="9" cy="-16" r="1.7" fill="#fff" opacity=".85"/></g>`

export const heart = (x, y, s = 1, c = C.pink) =>
  `<path transform="${t(x, y, s)}" d="M0 7 C-10 0 -14 -5 -14 -10 C-14 -15 -10 -18 -6 -18 C-3 -18 -1 -16 0 -14 C1 -16 3 -18 6 -18 C10 -18 14 -15 14 -10 C14 -5 10 0 0 7 Z" fill="${c}"/>`

export const star = (x, y, s = 1, c = C.yellow) =>
  `<path transform="${t(x, y, s)}" d="M0 -12 L3.5 -4 L12 -3.6 L5.5 2 L7.5 10.5 L0 6 L-7.5 10.5 L-5.5 2 L-12 -3.6 L-3.5 -4 Z" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`

export const envelope = (x, y, s = 1, r = 0) =>
  `<g transform="${t(x, y, s, r)}"><rect x="-24" y="-16" width="48" height="32" rx="4" fill="${C.cream}"/><path d="M-24 -13 L0 4 L24 -13 L24 -16 C24 -16 -24 -16 -24 -16 Z" fill="${C.yellow3}"/><path d="M-22 16 L-4 2 L4 2 L22 16 Z" fill="${C.yellow2}" opacity=".6"/>${heart(0, 1, 0.42, C.rose)}</g>`

export const books = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-28" y="-12" width="56" height="12" rx="3" fill="${C.sky}"/><rect x="-24" y="-11" width="3" height="10" rx="1.5" fill="#fff" opacity=".5"/><rect x="-24" y="-24" width="50" height="12" rx="3" fill="${C.pink}"/><rect x="-20" y="-23" width="3" height="10" rx="1.5" fill="#fff" opacity=".5"/><rect x="-30" y="-36" width="54" height="12" rx="3" fill="${C.mint}" transform="rotate(-3 -3 -30)"/><rect x="-26" y="-35" width="3" height="10" rx="1.5" fill="#fff" opacity=".5" transform="rotate(-3 -3 -30)"/></g>`

export const openBook = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><path d="M0 -6 C-10 -14 -26 -16 -38 -12 L-38 6 C-26 2 -10 4 0 12 Z" fill="${C.cream}"/><path d="M0 -6 C10 -14 26 -16 38 -12 L38 6 C26 2 10 4 0 12 Z" fill="#fff"/><path d="M-40 -10 L-40 10 C-26 6 -10 8 0 16 C10 8 26 6 40 10 L40 -10 L38 -12 L38 6 C26 2 10 4 0 12 C-10 4 -26 2 -38 6 L-38 -12 Z" fill="${C.sky}"/><rect x="-30" y="-6" width="20" height="2.4" rx="1.2" fill="${C.sky2}"/><rect x="-30" y="-1" width="16" height="2.4" rx="1.2" fill="${C.sky2}"/><rect x="10" y="-6" width="20" height="2.4" rx="1.2" fill="${C.pink2}"/><rect x="14" y="-1" width="16" height="2.4" rx="1.2" fill="${C.pink2}"/></g>`

export const pencil = (x, y, s = 1, r = -30, c = C.yellow) =>
  `<g transform="${t(x, y, s, r)}"><rect x="-4.5" y="-34" width="9" height="30" rx="2" fill="${c}"/><rect x="-4.5" y="-40" width="9" height="7" rx="3" fill="${C.pink}"/><path d="M-4.5 -4 L4.5 -4 L0 8 Z" fill="${C.brown2}"/><path d="M-1.6 4 L1.6 4 L0 8 Z" fill="${C.ink}"/></g>`

export function rainbow(x, y, r = 60, s = 1) {
  const cols = [C.pink, C.yellow, C.mint, C.sky]
  let arcs = ''
  cols.forEach((c, i) => {
    const rr = r - i * 9
    arcs += `<path d="M${-rr} 0 A${rr} ${rr} 0 0 1 ${rr} 0" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`
  })
  return `<g transform="${t(x, y, s)}">${arcs}${cloud(-r + 4, 4, 0.55)}${cloud(r - 4, 4, 0.55)}</g>`
}

export const bus = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-44" y="-40" width="88" height="32" rx="10" fill="${C.yellow}"/><rect x="-36" y="-34" width="14" height="12" rx="3" fill="${C.sky2}"/><rect x="-18" y="-34" width="14" height="12" rx="3" fill="${C.sky2}"/><rect x="0" y="-34" width="14" height="12" rx="3" fill="${C.sky2}"/><rect x="20" y="-34" width="16" height="18" rx="3" fill="${C.sky2}"/><rect x="-44" y="-18" width="88" height="5" fill="${C.orange}" opacity=".6"/><circle cx="-24" cy="-8" r="8" fill="${C.ink}" opacity=".75"/><circle cx="-24" cy="-8" r="3" fill="#fff"/><circle cx="24" cy="-8" r="8" fill="${C.ink}" opacity=".75"/><circle cx="24" cy="-8" r="3" fill="#fff"/></g>`

export const signpost = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-3" y="-58" width="6" height="58" rx="3" fill="${C.brown}"/><path d="M-4 -56 L26 -56 L34 -48 L26 -40 L-4 -40 Z" fill="${C.mint}"/><path d="M4 -36 L-26 -36 L-34 -28 L-26 -20 L4 -20 Z" fill="${C.pink}"/></g>`

export const ball = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><circle cx="0" cy="-14" r="14" fill="${C.sky}"/><path d="M-14 -14 A14 14 0 0 1 0 -28 L0 -14 Z" fill="${C.yellow}"/><path d="M14 -14 A14 14 0 0 1 0 0 L0 -14 Z" fill="${C.pink}"/></g>`

export const jumpRope = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><path d="M-30 -30 C-30 10 30 10 30 -30" fill="none" stroke="${C.rose}" stroke-width="4" stroke-linecap="round"/><rect x="-34" y="-46" width="8" height="18" rx="4" fill="${C.yellow}"/><rect x="26" y="-46" width="8" height="18" rx="4" fill="${C.yellow}"/></g>`

export const kite = (x, y, s = 1, r = -12) =>
  `<g transform="${t(x, y, s, r)}"><path d="M0 -34 L22 0 L0 34 L-22 0 Z" fill="${C.pink}"/><path d="M0 -34 L22 0 L0 0 Z" fill="${C.yellow}"/><path d="M0 0 L0 34 L-22 0 Z" fill="${C.sky}"/><path d="M0 34 C8 46 -8 54 2 66 C8 74 -4 80 2 88" fill="none" stroke="${C.rose}" stroke-width="2.6" stroke-linecap="round"/><path d="M-3 50 L5 46 L3 55 Z" fill="${C.mint}"/><path d="M-2 70 L6 67 L4 76 Z" fill="${C.yellow}"/></g>`

export const pouch = (x, y, s = 1, c = C.rose) =>
  `<g transform="${t(x, y, s)}"><path d="M-16 -30 C-10 -26 10 -26 16 -30 C14 -24 10 -22 6 -21 C22 -14 24 -2 18 4 C12 9 -12 9 -18 4 C-24 -2 -22 -14 -6 -21 C-10 -22 -14 -24 -16 -30 Z" fill="${c}"/><rect x="-8" y="-24" width="16" height="4" rx="2" fill="${C.yellow}"/><circle cx="0" cy="-8" r="5" fill="${C.yellow2}"/><path d="M-3 -8 L3 -8 M0 -11 L0 -5" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/></g>`

export const butterfly = (x, y, s = 1, c = C.pink, c2 = C.yellow, r = 0) =>
  `<g transform="${t(x, y, s, r)}"><ellipse cx="-9" cy="-6" rx="10" ry="8" fill="${c}"/><ellipse cx="9" cy="-6" rx="10" ry="8" fill="${c}"/><ellipse cx="-7" cy="7" rx="7" ry="6" fill="${c2}"/><ellipse cx="7" cy="7" rx="7" ry="6" fill="${c2}"/><rect x="-1.8" y="-10" width="3.6" height="22" rx="1.8" fill="${C.ink}" opacity=".7"/><path d="M-1 -10 C-3 -15 -6 -17 -8 -17 M1 -10 C3 -15 6 -17 8 -17" fill="none" stroke="${C.ink}" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/></g>`

export const bird = (x, y, s = 1, c = C.yellow, flip = false) =>
  `<g transform="${t(x, y, s)}${flip ? ' scale(-1 1)' : ''}"><ellipse cx="0" cy="0" rx="13" ry="10" fill="${c}"/><circle cx="9" cy="-8" r="8" fill="${c}"/><path d="M16 -9 L23 -6 L16 -4 Z" fill="${C.orange}"/><circle cx="11" cy="-10" r="1.6" fill="${C.ink}"/><circle cx="7" cy="-5" r="2.2" fill="${C.coral}" opacity=".5"/><path d="M-4 -2 C-10 -12 -20 -12 -22 -6 C-16 -2 -9 0 -4 -2 Z" fill="${C.yellow2}"/><path d="M-12 3 L-21 6 L-13 8 Z" fill="${c}"/></g>`

export const wind = (x, y, s = 1, c = C.sky) =>
  `<g transform="${t(x, y, s)}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M-40 -10 L10 -10 C22 -10 24 -26 12 -26 C4 -26 4 -18 8 -16"/><path d="M-30 4 L24 4 C36 4 38 18 26 18 C18 18 18 12 22 10"/></g>`

export const wateringCan = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-18" y="-30" width="30" height="30" rx="7" fill="${C.sky}"/><path d="M12 -22 L34 -40 L38 -36 L16 -14 Z" fill="${C.sky}"/><rect x="31" y="-46" width="12" height="7" rx="3" transform="rotate(-40 37 -42)" fill="${C.sky2}"/><path d="M-18 -26 C-30 -26 -30 -6 -18 -6" fill="none" stroke="${C.sky}" stroke-width="5" stroke-linecap="round"/><circle cx="46" cy="-38" r="2.4" fill="${C.sky}"/><circle cx="50" cy="-30" r="2" fill="${C.sky}"/><circle cx="44" cy="-26" r="2.2" fill="${C.sky}"/></g>`

export const carrot = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><path d="M-7 -20 C-7 -8 -3 2 0 8 C3 2 7 -8 7 -20 Z" fill="${C.orange}"/><path d="M0 -20 C-6 -30 -12 -30 -12 -26 C-8 -24 -4 -22 0 -20 Z M0 -20 C0 -30 4 -34 7 -32 C5 -28 3 -24 0 -20 Z M0 -20 C6 -28 12 -28 12 -24 C8 -22 4 -21 0 -20 Z" fill="${C.g1}"/></g>`

export const cabbage = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><circle cx="0" cy="-14" r="14" fill="${C.g4}"/><path d="M-14 -12 C-10 -30 10 -30 14 -12 C8 -20 -8 -20 -14 -12 Z" fill="${C.g2}"/><circle cx="0" cy="-12" r="6" fill="${C.g5}"/></g>`

export const blocks = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-26" y="-18" width="18" height="18" rx="3" fill="${C.sky}"/><rect x="-6" y="-18" width="18" height="18" rx="3" fill="${C.yellow}"/><rect x="-16" y="-36" width="18" height="18" rx="3" fill="${C.pink}"/><path d="M14 0 L32 0 L23 -16 Z" fill="${C.mint}"/></g>`

export const pinwheel = (x, y, s = 1) =>
  `<g transform="${t(x, y, s)}"><rect x="-1.8" y="-30" width="3.6" height="30" rx="1.8" fill="${C.brown}"/><g transform="translate(0 -34)"><path d="M0 0 L0 -16 C8 -16 12 -8 0 0 Z" fill="${C.pink}"/><path d="M0 0 L16 0 C16 8 8 12 0 0 Z" fill="${C.yellow}"/><path d="M0 0 L0 16 C-8 16 -12 8 0 0 Z" fill="${C.sky}"/><path d="M0 0 L-16 0 C-16 -8 -8 -12 0 0 Z" fill="${C.mint}"/><circle r="2.5" fill="#fff"/></g></g>`

export const leaf = (x, y, s = 1, r = 0, c = C.g2) =>
  `<g transform="${t(x, y, s, r)}"><path d="M0 0 C-10 -8 -10 -24 0 -32 C10 -24 10 -8 0 0 Z" fill="${c}"/><path d="M0 -3 L0 -26" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g>`

export const dots = (w, h, color, gap = 22, r = 2, opacity = 0.35) => {
  let out = ''
  for (let y = gap / 2; y < h; y += gap) for (let x = (Math.round(y / gap) % 2 ? gap / 2 : 0) + gap / 2; x < w; x += gap) out += `<circle cx="${x}" cy="${y}" r="${r}"/>`
  return `<g fill="${color}" opacity="${opacity}">${out}</g>`
}
