/**
 * Phase 17. 메인 화면 섹션 표시 설정 — site_settings 의 home_show_intro / home_show_albums.
 *   node scripts/migrate-jaramk/phase17-home-sections.ts                         dry-run(기본): 현재 값 출력
 *   node scripts/migrate-jaramk/phase17-home-sections.ts --apply --hide          두 섹션 숨김 ('false')
 *   node scripts/migrate-jaramk/phase17-home-sections.ts --apply --show          두 섹션 표시 ('true')
 *   node scripts/migrate-jaramk/phase17-home-sections.ts --rollback <백업.json>  백업 값으로 되돌리기
 * 관리자 > 사이트 설정 > 메인 화면 섹션 에서도 같은 값을 바꿀 수 있다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const VALUE = process.argv.includes('--show') ? 'true' : process.argv.includes('--hide') ? 'false' : null
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'home-sections')
const KEYS = [
  ['home_show_intro', '메인 화면 — 어린이집 소개 섹션 표시 (true/false)'],
  ['home_show_albums', '메인 화면 — 최근 앨범 섹션 표시 (true/false)'],
] as const

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

async function load(): Promise<Array<{ key: string; value: string | null }>> {
  const { data, error } = await db.from('site_settings').select('key, value').in('key', KEYS.map(([k]) => k))
  if (error) throw new Error(`site_settings 조회 실패: ${error.message}`)
  return (data ?? []) as Array<{ key: string; value: string | null }>
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const b = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { rows: Array<{ key: string; value: string | null }>; created: string[] }
    for (const r of b.rows) {
      const { error } = await db.from('site_settings').update({ value: r.value }).eq('key', r.key)
      if (error) throw new Error(`복원 실패 ${r.key}: ${error.message}`)
    }
    if (b.created.length) {
      const { error } = await db.from('site_settings').delete().in('key', b.created)
      if (error) throw new Error(`생성 키 삭제 실패: ${error.message}`)
    }
    log(`복원 완료: ${b.rows.length}개 값, 생성 키 ${b.created.length}개 삭제`)
    return
  }
  const rows = await load()
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  for (const [k] of KEYS) log(`- ${k}: ${byKey.has(k) ? `"${byKey.get(k)}"` : '(없음 → 표시)'}`)
  if (!APPLY || !VALUE) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply --hide 또는 --apply --show')
    return
  }
  const created = KEYS.map(([k]) => k).filter((k) => !byKey.has(k))
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows, created }, null, 2))
  const { error } = await db.from('site_settings').upsert(KEYS.map(([key, description]) => ({ key, value: VALUE, description })), { onConflict: 'key' })
  if (error) throw new Error(`반영 실패: ${error.message}`)
  log(`완료: 두 섹션 ${VALUE === 'false' ? '숨김' : '표시'}. 백업: ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
