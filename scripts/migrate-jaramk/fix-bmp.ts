/**
 * sharp 가 못 읽는 BMP(무압축 24/32비트)를 직접 디코드해 JPEG 변환본을 다시 만들고, 이미 올라간 객체를 같은 키에 덮어쓴다.
 *   node scripts/migrate-jaramk/fix-bmp.ts <로컬 변환본 경로(DATA_DIR 기준)> [--upload]
 * 예) node scripts/migrate-jaramk/fix-bmp.ts files/derived/board/www27/1627/1627_1436833091_0.jpg --upload
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { DERIVE_LONG_EDGE, DERIVE_QUALITY } from './lib/derive.ts'
import { adminClient } from './lib/supabase-admin.ts'
import { DATA_DIR, OUT_DIR } from './lib/paths.ts'
import type { UploadMapEntry } from './phase3-upload.ts'

const local = process.argv[2]
const doUpload = process.argv.includes('--upload')
if (!local) {
  console.error('사용법: fix-bmp.ts <DATA_DIR 기준 경로> [--upload]')
  process.exit(1)
}
const abs = join(DATA_DIR, local)
const buf = readFileSync(abs)
if (buf.subarray(0, 2).toString('latin1') !== 'BM') {
  console.error('BMP 가 아닙니다:', buf.subarray(0, 4).toString('hex'))
  process.exit(1)
}

// BITMAPFILEHEADER(14) + BITMAPINFOHEADER(40+)
const pixelOffset = buf.readUInt32LE(10)
const width = buf.readInt32LE(18)
const heightRaw = buf.readInt32LE(22)
const bpp = buf.readUInt16LE(28)
const compression = buf.readUInt32LE(30)
const height = Math.abs(heightRaw)
const bottomUp = heightRaw > 0
if (![8, 24, 32].includes(bpp) || compression !== 0) {
  console.error(`지원하지 않는 BMP: bpp=${bpp} compression=${compression}`)
  process.exit(1)
}
// 8비트는 팔레트(BGRA 4바이트 × 항목 수)가 INFOHEADER 뒤에 온다
const headerSize = buf.readUInt32LE(14)
const clrUsed = buf.readUInt32LE(46)
const paletteCount = bpp === 8 ? (clrUsed || 256) : 0
const paletteStart = 14 + headerSize
const rowSize = Math.floor((bpp * width + 31) / 32) * 4
const rgb = Buffer.alloc(width * height * 3)
for (let y = 0; y < height; y += 1) {
  const srcRow = bottomUp ? height - 1 - y : y
  const rowStart = pixelOffset + srcRow * rowSize
  for (let x = 0; x < width; x += 1) {
    const d = (y * width + x) * 3
    if (bpp === 8) {
      const idx = buf[rowStart + x]!
      const p = paletteStart + Math.min(idx, paletteCount - 1) * 4
      rgb[d] = buf[p + 2]!
      rgb[d + 1] = buf[p + 1]!
      rgb[d + 2] = buf[p]!
    } else {
      const s = rowStart + x * (bpp / 8)
      rgb[d] = buf[s + 2]! // R
      rgb[d + 1] = buf[s + 1]! // G
      rgb[d + 2] = buf[s]! // B
    }
  }
}
const out = await sharp(rgb, { raw: { width, height, channels: 3 } })
  .resize({ width: width >= height ? DERIVE_LONG_EDGE : undefined, height: height > width ? DERIVE_LONG_EDGE : undefined, withoutEnlargement: true })
  .jpeg({ quality: DERIVE_QUALITY, mozjpeg: true })
  .toBuffer({ resolveWithObject: true })
writeFileSync(abs, out.data)
console.log(`변환: ${width}x${height} ${bpp}bpp BMP ${buf.byteLength}B → JPEG ${out.info.width}x${out.info.height} ${out.data.byteLength}B (${local})`)

// upload-map 갱신 + (옵션) 덮어쓰기 업로드
const mapPath = join(OUT_DIR, 'upload-map.json')
const map = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, UploadMapEntry>
const entry = map[local]
if (!entry) {
  console.log('upload-map 에 없는 경로 — 업로드 생략')
  process.exit(0)
}
entry.bytes = statSync(abs).size
if (doUpload) {
  const { error } = await adminClient().storage.from(entry.bucket).upload(entry.objectPath, out.data, { contentType: 'image/jpeg', upsert: true })
  if (error) {
    console.error('업로드 실패:', error.message)
    process.exit(1)
  }
  entry.uploadedAt = new Date().toISOString()
  const res = await fetch(entry.ref)
  const got = Buffer.from(await res.arrayBuffer())
  console.log(`덮어쓰기 완료: ${entry.bucket}/${entry.objectPath} → GET ${res.status} ${got.byteLength}B ${got.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'JPEG ✅' : '❌'}`)
}
writeFileSync(mapPath, JSON.stringify(map, null, 2))
