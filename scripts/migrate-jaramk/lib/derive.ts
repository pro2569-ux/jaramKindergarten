/**
 * 사진 변환본 생성 — 업로드용 파생 파일. 원본은 그대로 두고 files/derived/ 아래에 JPEG 를 만든다.
 * 규칙(승인): PNG/BMP → JPEG, 긴 변 1920px 이하로 축소(확대 없음), 품질 85, EXIF 회전 반영.
 * sharp 가 못 읽는 포맷(BMP 등)은 원본을 그대로 복사한다.
 */
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import sharp from 'sharp'

export const DERIVE_LONG_EDGE = 1920
export const DERIVE_QUALITY = 85

export interface DeriveResult {
  dest: string
  bytes: number
  width: number | null
  height: number | null
  converted: boolean // false = 원본 복사 (미지원 포맷)
  fromCache: boolean
}

export async function deriveJpeg(src: string, dest: string): Promise<DeriveResult> {
  if (existsSync(dest)) {
    const size = statSync(dest).size
    if (size > 0) return { dest, bytes: size, width: null, height: null, converted: true, fromCache: true }
  }
  mkdirSync(dirname(dest), { recursive: true })
  try {
    const image = sharp(src).rotate()
    const meta = await image.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const out = await image
      .flatten({ background: '#ffffff' })
      .resize({ width: w >= h ? DERIVE_LONG_EDGE : undefined, height: h > w ? DERIVE_LONG_EDGE : undefined, withoutEnlargement: true })
      .jpeg({ quality: DERIVE_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
    writeFileSync(dest, out.data)
    return { dest, bytes: out.data.byteLength, width: out.info.width, height: out.info.height, converted: true, fromCache: false }
  } catch {
    copyFileSync(src, dest)
    return { dest, bytes: statSync(dest).size, width: null, height: null, converted: false, fromCache: false }
  }
}

/** 원본 로컬 경로(files/board/...) → 변환본 경로(files/derived/board/..., 확장자 .jpg) */
export function derivedPathFor(originalDest: string, filesDir: string): string {
  const rel = originalDest.startsWith(filesDir) ? originalDest.slice(filesDir.length).replace(/^[\\/]/, '') : originalDest
  const withJpg = rel.replace(/\.[^./\\]+$/, '') + '.jpg'
  return `${filesDir}/derived/${withJpg}`.replace(/\\/g, '/')
}
