/**
 * Phase 11. 글 하나 공개 전환 — posts.is_published 를 지정한 글 1건만 true 로 바꾼다 (입소신청서 등).
 *   node scripts/migrate-jaramk/phase11-publish-post.ts --id <uuid>              dry-run(기본): 현재 상태 출력, DB 변경 없음
 *   node scripts/migrate-jaramk/phase11-publish-post.ts --id <uuid> --apply      반영. 반영 전에 해당 행을 백업
 *   node scripts/migrate-jaramk/phase11-publish-post.ts --rollback <백업.json>   백업 시점의 is_published 로 되돌리기
 * 원칙: 지정한 글 1건 외에는 어떤 행도 건드리지 않는다 (앨범·다른 글의 공개 상태 불변)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ID_IDX = args.indexOf('--id')
const ID = ID_IDX >= 0 ? (args[ID_IDX + 1] ?? null) : null
const ROLLBACK_IDX = args.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (args[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'publish-post')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface PostRow { id: string; title: string; board_type: string; is_published: boolean; legacy_source_url: string | null; updated_at: string | null }

async function loadPost(id: string): Promise<PostRow> {
  const { data, error } = await db.from('posts').select('id, title, board_type, is_published, legacy_source_url, updated_at').eq('id', id).maybeSingle()
  if (error) throw new Error(`posts 조회 실패: ${error.message}`)
  if (!data) throw new Error(`글 없음: ${id}`)
  return data as PostRow
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const backup = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { row: PostRow }
    const { error } = await db.from('posts').update({ is_published: backup.row.is_published }).eq('id', backup.row.id)
    if (error) throw new Error(`복원 실패: ${error.message}`)
    log(`복원: «${backup.row.title}» is_published=${backup.row.is_published}`)
    return
  }
  if (!ID) throw new Error('--id <uuid> 가 필요합니다')
  const row = await loadPost(ID)
  log(`글: «${row.title}» (${row.board_type}, ${row.is_published ? '공개' : '비공개'}, 원본 ${row.legacy_source_url ?? '-'})`)
  if (row.is_published) {
    log('이미 공개 상태입니다. 바꿀 것 없음.')
    return
  }
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), row }, null, 2))
  log(`백업 저장: ${backupPath}`)
  const { error } = await db.from('posts').update({ is_published: true }).eq('id', row.id)
  if (error) throw new Error(`반영 실패: ${error.message}`)
  const after = await loadPost(ID)
  log(`완료: «${after.title}» is_published=${after.is_published}. 되돌리기: --rollback ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
