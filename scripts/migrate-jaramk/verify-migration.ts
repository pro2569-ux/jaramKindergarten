/**
 * 마이그레이션 적용 확인 (읽기 전용).
 *   node scripts/migrate-jaramk/verify-migration.ts
 * - 컬럼: PostgREST 로 select 해 보고 존재 여부 판단 (데이터는 limit 1, 값은 출력하지 않음)
 * - 버킷: Storage API 로 legacy-media 속성 확인 (public=false, 50MB, 이미지 MIME)
 * - 정책: pg_policies 는 REST 로 볼 수 없어 여기선 확인 불가 (대시보드 Storage > Policies 에서 확인)
 */
import { restHeaders, supabaseUrl } from './lib/supabase-admin.ts'

const url = supabaseUrl()
const headers = restHeaders()

const COLUMNS: Array<[table: string, column: string]> = [
  ['pages', 'legacy_source_url'],
  ['pages', 'legacy_meta'],
  ['posts', 'legacy_source_url'],
  ['posts', 'legacy_meta'],
  ['albums', 'category'],
  ['albums', 'legacy_source_url'],
  ['albums', 'legacy_meta'],
  ['album_photos', 'legacy_source_url'],
  ['menus', 'legacy_source_url'],
]

let ok = true
console.log('=== 컬럼 ===')
for (const [table, column] of COLUMNS) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, { headers })
  const exists = res.ok
  if (!exists) ok = false
  const detail = exists ? '' : ` (HTTP ${res.status}: ${(await res.text()).slice(0, 120)})`
  console.log(`  ${exists ? '✅' : '❌'} ${table}.${column}${detail}`)
}

console.log('=== 버킷 ===')
const bucketRes = await fetch(`${url}/storage/v1/bucket/legacy-media`, { headers })
if (bucketRes.ok) {
  const b = (await bucketRes.json()) as { id: string; public: boolean; file_size_limit: number | null; allowed_mime_types: string[] | null }
  const good = b.public === false
  if (!good) ok = false
  console.log(`  ${good ? '✅' : '❌'} legacy-media: public=${b.public} file_size_limit=${b.file_size_limit} mime=${(b.allowed_mime_types ?? []).join(',')}`)
} else {
  ok = false
  console.log(`  ❌ legacy-media 버킷 없음 (HTTP ${bucketRes.status})`)
}
const pubRes = await fetch(`${url}/storage/v1/bucket/publicImage`, { headers })
console.log(`  ${pubRes.ok ? '✅' : '❌'} publicImage 버킷 ${pubRes.ok ? '존재' : '없음'}`)

console.log('=== 서명 URL 발급 경로 (service role) ===')
const signRes = await fetch(`${url}/storage/v1/object/sign/legacy-media/__probe__/none.jpg`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ expiresIn: 60 }),
})
// 객체가 없으므로 404("Object not found")가 정상. 401/403 이면 키/버킷 문제.
const signText = await signRes.text()
const signOk = signRes.status === 404 || signRes.status === 400
console.log(`  ${signOk ? '✅' : '❌'} sign 엔드포인트 응답 HTTP ${signRes.status} ${signText.slice(0, 80)}`)
if (!signOk) ok = false

console.log(ok ? '\n결과: 모두 확인됨' : '\n결과: 문제 있음 (위 ❌ 항목 확인)')
process.exit(ok ? 0 : 1)
