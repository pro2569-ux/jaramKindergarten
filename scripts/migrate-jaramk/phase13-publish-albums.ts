/**
 * Phase 13. 이관 앨범 전체 공개 — albums 중 이관분(legacy_source_url 있음)의 is_published 를 true 로.
 *   node scripts/migrate-jaramk/phase13-publish-albums.ts                     dry-run(기본): 대상 수·현재 상태 출력
 *   node scripts/migrate-jaramk/phase13-publish-albums.ts --apply             반영. 반영 전에 대상 행(id, is_published)을 백업
 *   node scripts/migrate-jaramk/phase13-publish-albums.ts --rollback <백업.json>   백업 시점의 is_published 로 되돌리기
 * 원칙: 이관 앨범 외(수동 생성 앨범, 게시글)는 건드리지 않는다
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'publish-albums')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface AlbumRow { id: string; title: string; category: string | null; is_published: boolean; legacy_source_url: string | null }

async function loadLegacyAlbums(): Promise<AlbumRow[]> {
  const rows: AlbumRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('albums').select('id, title, category, is_published, legacy_source_url').not('legacy_source_url', 'is', null).order('created_at').range(from, from + 999)
    if (error) throw new Error(`albums 조회 실패: ${error.message}`)
    rows.push(...((data ?? []) as AlbumRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const backup = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { rows: Array<{ id: string; is_published: boolean }> }
    const toHide = backup.rows.filter((r) => !r.is_published).map((r) => r.id)
    const toShow = backup.rows.filter((r) => r.is_published).map((r) => r.id)
    for (const [ids, value] of [[toHide, false], [toShow, true]] as const) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await db.from('albums').update({ is_published: value }).in('id', ids.slice(i, i + 200))
        if (error) throw new Error(`복원 실패: ${error.message}`)
      }
    }
    log(`복원 완료: 비공개 ${toHide.length}건, 공개 ${toShow.length}건`)
    return
  }

  const albums = await loadLegacyAlbums()
  const unpublished = albums.filter((a) => !a.is_published)
  const byCategory = new Map<string, number>()
  for (const a of albums) byCategory.set(a.category ?? '(없음)', (byCategory.get(a.category ?? '(없음)') ?? 0) + 1)
  log(`이관 앨범 ${albums.length}건 (공개 ${albums.length - unpublished.length}, 비공개 ${unpublished.length})`)
  log(`반별: ${[...byCategory.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`)
  if (unpublished.length === 0) {
    log('비공개 이관 앨범이 없습니다. 바꿀 것 없음.')
    return
  }
  if (!APPLY) {
    log(`→ ${unpublished.length}건을 공개로 바꿉니다. dry-run 입니다 (DB 변경 없음). 반영하려면 --apply`)
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: albums.map((a) => ({ id: a.id, title: a.title, is_published: a.is_published })) }, null, 2))
  log(`백업 저장 (이관 앨범 ${albums.length}건의 is_published): ${backupPath}`)
  const ids = unpublished.map((a) => a.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await db.from('albums').update({ is_published: true }).in('id', ids.slice(i, i + 200))
    if (error) throw new Error(`반영 실패: ${error.message}`)
    log(`  ${Math.min(i + 200, ids.length)}/${ids.length}`)
  }
  const after = await loadLegacyAlbums()
  log(`완료: 이관 앨범 공개 ${after.filter((a) => a.is_published).length}/${after.length}. 되돌리기: --rollback ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
