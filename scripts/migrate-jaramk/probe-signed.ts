/**
 * 업로드 검증 프로브 (읽기 전용): legacy-media 객체 1개를 서명 URL 로 받아보고, publicImage 첨부 1개를 공개 URL 로 받아본다.
 *   node scripts/migrate-jaramk/probe-signed.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { OUT_DIR } from './lib/paths.ts'
import type { UploadMapEntry } from './phase3-upload.ts'

const map = JSON.parse(readFileSync(join(OUT_DIR, 'upload-map.json'), 'utf8')) as Record<string, UploadMapEntry>
const entries = Object.values(map)
const photo = entries.find((e) => e.bucket === 'legacy-media')
const attach = entries.find((e) => e.objectPath.includes('/attach/'))
const client = adminClient()

if (photo) {
  const { data, error } = await client.storage.from('legacy-media').createSignedUrl(photo.objectPath, 60)
  if (error || !data) console.log('❌ 서명 실패:', error?.message)
  else {
    const res = await fetch(data.signedUrl)
    const buf = Buffer.from(await res.arrayBuffer())
    console.log(`${res.ok && buf.subarray(0, 3).toString('hex') === 'ffd8ff' ? '✅' : '❌'} 서명 URL: HTTP ${res.status} ${res.headers.get('content-type')} ${buf.byteLength}B (${photo.objectPath}, 저장값 ${photo.bytes}B)`)
    const pub = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/legacy-media/${photo.objectPath}`)
    console.log(`${pub.ok ? '❌ 공개 URL 로도 열림 (버킷이 public?)' : '✅ 공개 URL 은 차단'}: HTTP ${pub.status}`)
  }
}
if (attach) {
  const res = await fetch(attach.ref)
  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`${res.ok ? '✅' : '❌'} 첨부 공개 URL: HTTP ${res.status} ${buf.byteLength}B content-disposition=${res.headers.get('content-disposition')}`)
}
