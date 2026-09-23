/**
 * 리사이즈 용량 추정 — 수집된 앨범 사진에서 100장을 표본 추출해 긴 변 1920px / 1600px 로 줄였을 때
 * 용량이 얼마나 되는지 재고, 전체(수집분 + 미수집분)로 외삽한다. 원본 파일은 건드리지 않는다.
 *   node scripts/migrate-jaramk/resize-estimate.ts [--sample=100] [--quality=85]
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { FILES_DIR, OUT_DIR } from './lib/paths.ts'

const argv = process.argv.slice(2)
const opt = (name: string, def: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def
const SAMPLE = Number(opt('sample', '100'))
const QUALITY = Number(opt('quality', '85'))
const TARGETS = [1920, 1600]

// 수집된 사진 전체 목록 (jpg/jpeg 는 표본 추출, png/bmp 는 수가 적고 크기가 커서 전수 측정 → JPEG 로 변환 가정)
const boardDir = join(FILES_DIR, 'board')
const all: string[] = []
const pngs: string[] = []
for (const board of readdirSync(boardDir)) {
  for (const num of readdirSync(join(boardDir, board))) {
    for (const f of readdirSync(join(boardDir, board, num))) {
      if (/\.jpe?g$/i.test(f)) all.push(join(boardDir, board, num, f))
      else if (/\.(?:png|bmp)$/i.test(f)) pngs.push(join(boardDir, board, num, f))
    }
  }
}
const totalBytes = all.reduce((n, f) => n + statSync(f).size, 0)
const pngBytes = pngs.reduce((n, f) => n + statSync(f).size, 0)

// 재현 가능한 표본 (고정 시드 LCG)
let seed = 20260923
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
const pool = [...all]
for (let i = pool.length - 1; i > 0; i -= 1) {
  const j = Math.floor(rand() * (i + 1))
  ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
}
const sample = pool.slice(0, Math.min(SAMPLE, pool.length))

const sums: Record<string, number> = { original: 0 }
for (const t of TARGETS) sums[String(t)] = 0
const dims: Array<{ w: number; h: number }> = []
const alreadySmall: Record<string, number> = {}
for (const t of TARGETS) alreadySmall[String(t)] = 0

for (const file of sample) {
  const input = readFileSync(file)
  sums.original! += input.byteLength
  const meta = await sharp(input).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  dims.push({ w, h })
  for (const t of TARGETS) {
    const longEdge = Math.max(w, h)
    if (longEdge <= t) {
      alreadySmall[String(t)]! += 1
      sums[String(t)]! += input.byteLength // 확대하지 않음 → 원본 유지 (재인코딩 없이)
      continue
    }
    const out = await sharp(input)
      .rotate() // EXIF 회전 반영
      .resize({ width: w >= h ? t : undefined, height: h > w ? t : undefined, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer()
    sums[String(t)]! += out.byteLength
  }
}

// PNG/BMP 전수: JPEG(quality) 변환 + 긴 변 축소
const pngSums: Record<string, number> = { original: pngBytes }
for (const t of TARGETS) pngSums[String(t)] = 0
const unsupported: string[] = []
for (const file of pngs) {
  const input = readFileSync(file)
  try {
    const meta = await sharp(input).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    for (const t of TARGETS) {
      const out = await sharp(input)
        .rotate()
        .flatten({ background: '#ffffff' })
        .resize({ width: w >= h ? t : undefined, height: h > w ? t : undefined, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer()
      pngSums[String(t)]! += out.byteLength
    }
  } catch {
    // sharp 미지원 포맷(BMP 등): 변환 없이 원본 크기로 계산
    unsupported.push(file)
    for (const t of TARGETS) pngSums[String(t)]! += input.byteLength
  }
}

const n = sample.length
const avgOrig = sums.original! / n
const mb = (b: number) => (b / 1024 / 1024).toFixed(1)
const pendingUrls = (() => {
  try {
    const p = JSON.parse(readFileSync(join(OUT_DIR, 'photo-pending.json'), 'utf8')) as Array<{ photoUrls: string[] }>
    return p.reduce((c, x) => c + x.photoUrls.length, 0)
  } catch {
    return 0
  }
})()
const wAvg = dims.reduce((s, d) => s + d.w, 0) / n
const hAvg = dims.reduce((s, d) => s + d.h, 0) / n

const result = {
  generatedAt: new Date().toISOString(),
  sampleSize: n,
  quality: QUALITY,
  collectedPhotos: all.length,
  collectedBytes: totalBytes,
  pendingPhotoUrls: pendingUrls,
  sampleAvgDims: { width: Math.round(wAvg), height: Math.round(hAvg) },
  sampleAvgOriginalBytes: Math.round(avgOrig),
  png: { count: pngs.length, originalBytes: pngBytes, unsupported },
  estimates: TARGETS.map((t) => {
    const ratio = sums[String(t)]! / sums.original!
    const avg = sums[String(t)]! / n
    const jpgEstimate = Math.round(totalBytes * ratio)
    const pngEstimate = pngSums[String(t)]!
    return {
      longEdge: t,
      sampleBytes: sums[String(t)],
      ratio,
      avgBytesPerPhoto: Math.round(avg),
      alreadySmallerCount: alreadySmall[String(t)],
      jpgCollectedEstimate: jpgEstimate,
      pngConvertedBytes: pngEstimate,
      collectedTotalEstimate: jpgEstimate + pngEstimate,
      // 미수집분은 jpg 표본 평균으로 외삽 (PNG 비율은 알 수 없어 보수적으로 jpg 평균 사용)
      allPhotosEstimate: jpgEstimate + pngEstimate + Math.round(avg * pendingUrls),
    }
  }),
}
writeFileSync(join(OUT_DIR, 'resize-estimate.json'), JSON.stringify(result, null, 2))

console.log(`수집 사진: jpg ${all.length}장 ${mb(totalBytes)}MB + png/bmp ${pngs.length}장 ${mb(pngBytes)}MB = ${mb(totalBytes + pngBytes)}MB`)
console.log(`jpg 표본 ${n}장: 평균 ${(avgOrig / 1024).toFixed(0)}KB, 평균 ${Math.round(wAvg)}x${Math.round(hAvg)}, JPEG 품질 ${QUALITY}`)
console.log('긴 변   jpg 표본 원본→축소   비율   jpg 수집분 추정   png→jpeg 전수   수집분 합계   미수집 ' + pendingUrls + '장 포함 전체')
for (const e of result.estimates) {
  console.log(
    `${String(e.longEdge).padEnd(7)} ${mb(sums.original!)}MB→${mb(e.sampleBytes!)}MB   ${(e.ratio * 100).toFixed(0).padStart(3)}%   ${mb(e.jpgCollectedEstimate).padStart(8)}MB      ${mb(e.pngConvertedBytes).padStart(8)}MB   ${mb(e.collectedTotalEstimate).padStart(8)}MB   ${mb(e.allPhotosEstimate).padStart(8)}MB   (jpg 표본 중 이미 작은 사진 ${e.alreadySmallerCount}장)`
  )
}
