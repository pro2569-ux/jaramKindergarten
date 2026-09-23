import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

/** 리포지토리 루트 (scripts/migrate-jaramk/lib 의 세 단계 위) */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

// .env.local 로드 (JARAMK_COOKIE, JARAMK_DATA_DIR, SUPABASE_* 등). 이미 설정된 환경변수가 우선.
// 값은 어디에도 출력하지 않는다.
const ENV_PATH = join(REPO_ROOT, '.env.local')
if (existsSync(ENV_PATH)) {
  try {
    process.loadEnvFile(ENV_PATH)
  } catch {
    // 파싱 실패 시 무시 — 필요한 값이 없으면 각 스크립트가 명확히 실패한다
  }
}

/**
 * 수집 데이터 폴더. JARAMK_DATA_DIR(.env.local) 로 지정 — 리포/워크트리 밖 경로 권장.
 * 미지정 시 scripts/migrate-jaramk/data (gitignore 대상, 워크트리 삭제 시 함께 사라짐).
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
