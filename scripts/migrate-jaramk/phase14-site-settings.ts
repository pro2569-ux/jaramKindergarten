/**
 * Phase 14. 실제 연락처·오시는길을 site_settings 에 반영 (임시/더미 값 교체).
 *   node scripts/migrate-jaramk/phase14-site-settings.ts                     dry-run(기본): 현재 값 → 새 값 출력
 *   node scripts/migrate-jaramk/phase14-site-settings.ts --apply             반영. 반영 전에 site_settings 전체를 백업
 *   node scripts/migrate-jaramk/phase14-site-settings.ts --rollback <백업.json>   백업 시점 값으로 되돌리기 (이 스크립트가 만든 키는 삭제)
 * 값의 출처: 원본 jaramk.com 오시는길 (pageCode 67). 이메일은 실제 값이 없어 비운다(푸터에 표시 안 함).
 * 좌표(kakao_map_lat/lng)는 알 수 없어 비운다 → 지도 페이지가 주소로 위치를 찾는다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'site-settings')

const NEW_VALUES: Record<string, { value: string; description: string }> = {
  address: { value: '고양시 덕양구 고양대로 2002번길 16-13', description: '주소' },
  address_detail: { value: '(동산동 47-88)', description: '주소 상세 (지번 등)' },
  phone: { value: '02-387-0188', description: '대표 전화번호' },
  mobile: { value: '010-3849-9198', description: '휴대전화' },
  fax: { value: '02-387-0183', description: '팩스 번호' },
  email: { value: '', description: '대표 이메일' },
  transit_bus: { value: '큰골입구 버스 정류장에서 하차 (9703, 730, 705, 773)', description: '오시는길 — 버스' },
  transit_subway: { value: '3호선 삼송역 3번출구에서 300M 이동 → 용사촌 앞 교차로에서 횡단보도 이용 → 고봉삼계탕에서 오른쪽으로 이동 → 자람동산 어린이집 도착', description: '오시는길 — 지하철' },
  transit_car: { value: '구파발 방향에서 고봉삼계탕 보이자마자 우회전', description: '오시는길 — 자가용' },
  kakao_map_lat: { value: '', description: '카카오맵 위도' },
  kakao_map_lng: { value: '', description: '카카오맵 경도' },
}

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface Row { key: string; value: string | null; description: string | null }

async function loadAll(): Promise<Row[]> {
  const { data, error } = await db.from('site_settings').select('key, value, description').order('key')
  if (error) throw new Error(`site_settings 조회 실패: ${error.message}`)
  return (data ?? []) as Row[]
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const backup = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { rows: Row[]; created: string[] }
    for (const r of backup.rows) {
      const { error } = await db.from('site_settings').update({ value: r.value, description: r.description }).eq('key', r.key)
      if (error) throw new Error(`복원 실패 ${r.key}: ${error.message}`)
    }
    if (backup.created.length) {
      const { error } = await db.from('site_settings').delete().in('key', backup.created)
      if (error) throw new Error(`생성 키 삭제 실패: ${error.message}`)
    }
    log(`복원 완료: ${backup.rows.length}개 값 복원, 생성 키 ${backup.created.length}개 삭제`)
    return
  }

  const rows = await loadAll()
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const created: string[] = []
  log('== 변경 계획')
  for (const [key, next] of Object.entries(NEW_VALUES)) {
    const cur = byKey.get(key)
    if (!cur) created.push(key)
    const same = cur && (cur.value ?? '') === next.value
    log(`- ${key.padEnd(16)} ${cur ? `"${cur.value ?? ''}"` : '(없음)'} → "${next.value}"${same ? '  (같음)' : ''}`)
  }
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows, created }, null, 2))
  log(`백업 저장 (site_settings 전체 ${rows.length}행): ${backupPath}`)
  const upsert = Object.entries(NEW_VALUES).map(([key, v]) => ({ key, value: v.value, description: v.description }))
  const { error } = await db.from('site_settings').upsert(upsert, { onConflict: 'key' })
  if (error) throw new Error(`반영 실패: ${error.message}`)
  log(`완료: ${upsert.length}개 키 반영 (새로 만든 키 ${created.length}개). 되돌리기: --rollback ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
