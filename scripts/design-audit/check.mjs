#!/usr/bin/env node
/**
 * 반응형 검사 요약 — capture.mjs 가 남긴 metrics.json 을 읽어 페이지·뷰포트별 문제를 세고 0건인지 확인한다.
 *   node scripts/design-audit/check.mjs --metrics <dir>/metrics.json [--max-center-diff 2]
 * 검사 항목
 *   - 가로 넘침 (overflowX): 문서 폭이 뷰포트보다 큼
 *   - 작은 글씨 (smallText): 보이는 텍스트의 글꼴 크기 12px 미만
 *   - 치우침 (offCenter): 본문(.content) 안에서 본문 폭 60% 미만인 표·이미지·고정폭 블록의 좌우 여백 차가 24px 초과
 *   - 정렬 (containerCenterDiff): 페이지 컨테이너(max-w-[1200px])의 좌우 여백 차가 기준(px) 초과
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const file = opt('metrics', null)
const maxCenter = Number(opt('max-center-diff', 2))
if (!file) {
  console.error('--metrics <metrics.json> 이 필요합니다.')
  process.exit(2)
}
const rows = JSON.parse(readFileSync(file, 'utf8'))
const counts = { overflow: 0, smallText: 0, offCenter: 0, center: 0 }
let bad = 0
for (const m of rows) {
  const probs = []
  if (m.overflowX) {
    counts.overflow++
    probs.push(`가로 넘침 +${m.overflowPx}px ${(m.overflowers || []).map((o) => `<${o.tag}${o.class ? ' .' + o.class.split(' ')[0] : ''} right ${o.right}>`).join(', ')}`)
  }
  if (m.smallTextCount) {
    counts.smallText++
    probs.push(`작은 글씨 ${m.smallTextCount}곳: ${(m.smallText || []).map((s) => `${s.fontSize}px <${s.tag}> "${s.text}"`).join(' | ')}`)
  }
  if (m.offCenterCount) {
    counts.offCenter++
    probs.push(`치우친 블록 ${m.offCenterCount}곳: ${(m.offCenter || []).map((o) => `<${o.tag}> ${o.width}/${o.container}px 좌 ${o.leftGap} 우 ${o.rightGap}`).join(' | ')}`)
  }
  if (typeof m.containerCenterDiff === 'number' && m.containerCenterDiff > maxCenter) {
    counts.center++
    probs.push(`컨테이너 좌우 여백 차 ${m.containerCenterDiff}px`)
  }
  if (probs.length) {
    bad++
    console.log(`✗ [${m.viewport}] ${m.path}`)
    for (const p of probs) console.log(`    - ${p}`)
  }
}
console.log(`\n검사 ${rows.length}건 → 문제 있는 캡처 ${bad}건 (넘침 ${counts.overflow}, 작은 글씨 ${counts.smallText}, 치우침 ${counts.offCenter}, 정렬 ${counts.center})`)
process.exitCode = bad > 0 ? 1 : 0
