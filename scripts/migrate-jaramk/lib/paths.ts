import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

/** 리포지토리 루트 (scripts/migrate-jaramk/lib 의 세 단계 위) */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/**
 * 수집 데이터 폴더. 기본은 scripts/migrate-jaramk/data (gitignore 대상).
 * 워크트리 밖에 두고 싶으면 JARAMK_DATA_DIR 로 지정.
 */
export const DATA_DIR = process.env.JARAMK_DATA_DIR ?? join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data')

export const RAW_DIR = join(DATA_DIR, 'raw') // 원본 응답 캐시 (HTML/바이너리 + 메타)
export const FILES_DIR = join(DATA_DIR, 'files') // 다운로드한 이미지/첨부
export const PARSED_DIR = join(DATA_DIR, 'parsed') // 파싱 결과 JSON
export const OUT_DIR = join(DATA_DIR, 'out') // inventory.json, 리포트 등

export function ensureDirs(): void {
  for (const dir of [DATA_DIR, RAW_DIR, FILES_DIR, PARSED_DIR, OUT_DIR]) {
    mkdirSync(dir, { recursive: true })
  }
}
