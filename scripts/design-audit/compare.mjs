/**
 * 수정 전/후 스크린샷을 나란히 붙인 비교 이미지를 만든다 (sharp 사용, 루트 devDependency).
 *   node scripts/design-audit/compare.mjs --before <dir> --after <dir> --out <dir> [--width 600] [--maxHeight 2400]
 * before/after 폴더에서 같은 파일명(pc_*.png, mobile_*.png)을 짝지어 <out>/<name>.png 로 저장한다.
 * pc 는 --width, mobile 은 그 절반 폭으로 축소하고, 위에서 --maxHeight 까지만 잘라 붙인다.
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}
const beforeDir = arg('before')
const afterDir = arg('after')
const outDir = arg('out')
const pcWidth = Number(arg('width', '600'))
const maxHeight = Number(arg('maxHeight', '2400'))
if (!beforeDir || !afterDir || !outDir) {
  console.error('usage: --before <dir> --after <dir> --out <dir>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const LABEL_H = 36
const GAP = 24

async function prepare(file, width) {
  const meta = await sharp(file).metadata()
  const scale = width / meta.width
  const h = Math.min(Math.round(meta.height * scale), maxHeight)
  const buf = await sharp(file).resize({ width }).extract({ left: 0, top: 0, width, height: h }).png().toBuffer()
  return { buf, width, height: h, original: `${meta.width}×${meta.height}` }
}

function labelSvg(text, width) {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return Buffer.from(
    `<svg width="${width}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111827"/><text x="12" y="24" font-family="Pretendard, Arial, sans-serif" font-size="16" fill="#ffffff">${safe}</text></svg>`,
  )
}

const files = readdirSync(afterDir).filter((f) => f.endsWith('.png') && existsSync(join(beforeDir, f)))
if (files.length === 0) console.log('짝이 맞는 파일이 없습니다.')
for (const f of files) {
  const width = f.startsWith('mobile') ? Math.round(pcWidth / 2) : pcWidth
  const a = await prepare(join(beforeDir, f), width)
  const b = await prepare(join(afterDir, f), width)
  const height = Math.max(a.height, b.height) + LABEL_H
  const canvas = sharp({ create: { width: width * 2 + GAP, height, channels: 4, background: '#e5e7eb' } })
  const out = await canvas
    .composite([
      { input: labelSvg(`BEFORE  ${basename(f)}  (${a.original})`, width), left: 0, top: 0 },
      { input: a.buf, left: 0, top: LABEL_H },
      { input: labelSvg(`AFTER  ${basename(f)}  (${b.original})`, width), left: width + GAP, top: 0 },
      { input: b.buf, left: width + GAP, top: LABEL_H },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
  const target = join(outDir, f)
  await sharp(out).toFile(target)
  console.log(`${f}: ${a.original} → ${b.original}`)
}
console.log(`완료: ${files.length}장 → ${outDir}`)
