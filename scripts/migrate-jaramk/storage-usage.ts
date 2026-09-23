/**
 * 우리 Supabase Storage 사용량 (읽기 전용). 버킷 목록 + 객체 크기 합계.
 *   node scripts/migrate-jaramk/storage-usage.ts
 * .env.local 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 사용. 키 값은 출력하지 않음.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OUT_DIR, ensureDirs } from './lib/paths.ts'

ensureDirs()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('실패: .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.')
  process.exit(1)
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

interface Bucket { id: string; name: string; public: boolean; file_size_limit: number | null }
interface StorageObject { name: string; id: string | null; metadata: { size?: number; mimetype?: string } | null }

async function listAll(bucket: string, prefix: string): Promise<{ files: number; bytes: number }> {
  let files = 0
  let bytes = 0
  const limit = 1000
  let offset = 0
  for (;;) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST', // Storage API 의 목록 조회 엔드포인트 (읽기 전용 작업)
      headers,
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`object list 실패 ${bucket}/${prefix}: HTTP ${res.status} ${await res.text()}`)
    const items = (await res.json()) as StorageObject[]
    for (const it of items) {
      if (it.id === null) {
        // 폴더
        const sub = await listAll(bucket, prefix ? `${prefix}/${it.name}` : it.name)
        files += sub.files
        bytes += sub.bytes
      } else {
        files += 1
        bytes += it.metadata?.size ?? 0
      }
    }
    if (items.length < limit) break
    offset += limit
  }
  return { files, bytes }
}

const bucketsRes = await fetch(`${url}/storage/v1/bucket`, { headers })
if (!bucketsRes.ok) {
  console.error(`실패: 버킷 목록 조회 HTTP ${bucketsRes.status} ${await bucketsRes.text()}`)
  process.exit(1)
}
const buckets = (await bucketsRes.json()) as Bucket[]
const rows: Array<{ bucket: string; public: boolean; files: number; bytes: number }> = []
for (const b of buckets) {
  const { files, bytes } = await listAll(b.name, '')
  rows.push({ bucket: b.name, public: b.public, files, bytes })
}
const totalBytes = rows.reduce((n, r) => n + r.bytes, 0)
const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + ' MB'

console.log('=== Supabase Storage 사용량 (읽기 전용) ===')
for (const r of rows) console.log(`  ${r.bucket.padEnd(20)} ${r.public ? 'public ' : 'private'} files=${String(r.files).padStart(5)} ${mb(r.bytes).padStart(10)}`)
console.log(`  합계: ${rows.reduce((n, r) => n + r.files, 0)} files, ${mb(totalBytes)} (무료 플랜 한도 1024 MB)`)

const out = { checkedAt: new Date().toISOString(), projectUrlHost: new URL(url).host, buckets: rows, totalBytes }
writeFileSync(join(OUT_DIR, 'storage-usage.json'), JSON.stringify(out, null, 2))
