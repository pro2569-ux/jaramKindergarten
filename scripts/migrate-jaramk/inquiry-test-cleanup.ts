/**
 * 문의 API 검증용 테스트 행 확인·삭제 — 제목이 "[테스트] API 접수 확인" 인 inquiries 행만 다룬다.
 *   node scripts/migrate-jaramk/inquiry-test-cleanup.ts            확인만
 *   node scripts/migrate-jaramk/inquiry-test-cleanup.ts --delete   삭제
 */
import { adminClient } from './lib/supabase-admin.ts'

const DELETE = process.argv.includes('--delete')
const TITLE = '[테스트] API 접수 확인'
const db = adminClient()

async function main(): Promise<void> {
  // consent_at 컬럼은 보안 SQL 실행 전엔 없을 수 있어 * 로 읽는다
  const { data, error } = await db.from('inquiries').select('*').eq('title', TITLE)
  if (error) throw new Error(`조회 실패: ${error.message}`)
  const rows = (data ?? []) as unknown as Array<{ id: string; status: string; is_private: boolean; created_at: string; consent_at?: string | null }>
  console.log(`테스트 문의 ${rows.length}건: ${rows.map((r) => `${r.id.slice(0, 8)} status=${r.status} private=${r.is_private} consent_at=${r.consent_at ?? '(컬럼 없음/미기록)'}`).join(' | ')}`)
  if (DELETE && rows.length) {
    const { error: e } = await db.from('inquiries').delete().in('id', rows.map((r) => r.id))
    if (e) throw new Error(`삭제 실패: ${e.message}`)
    console.log(`삭제 완료 ${rows.length}건`)
  }
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
