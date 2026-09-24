/**
 * Phase 18. 교육자료실(원본 boardID=www27, posts.board_type='newsletter' 이관분) 공개 전환.
 *   node scripts/migrate-jaramk/phase18-publish-archive.ts                     dry-run(기본): 대상/제외 목록 출력
 *   node scripts/migrate-jaramk/phase18-publish-archive.ts --check-origin      + 원본 사이트 목록을 읽어 DB 에 없는 신규 글 보고
 *   node scripts/migrate-jaramk/phase18-publish-archive.ts --apply             백업 JSON 저장 후 is_published=true
 *   node scripts/migrate-jaramk/phase18-publish-archive.ts --exclude 903,1712  제외할 원본 글 번호 (기본 903,1712)
 *   node scripts/migrate-jaramk/phase18-publish-archive.ts --rollback <백업>   백업 값으로 되돌리기
 * 원본 목록 읽기는 이 리포 안의 data/raw 캐시만 쓴다 (JARAMK_DATA_DIR 폴더는 건드리지 않음).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'
import { listUrl, parseListPage } from './lib/board.ts'
import { fetchHtml } from './lib/http.ts'

const BOARD_ID = 'www27'
const BOARD_TYPE = 'newsletter'
const APPLY = process.argv.includes('--apply')
const CHECK_ORIGIN = process.argv.includes('--check-origin')
const argAfter = (flag: string): string | null => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? (process.argv[i + 1] ?? null) : null
}
const EXCLUDE = new Set((argAfter('--exclude') ?? '903,1712').split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)))
const ROLLBACK_FILE = argAfter('--rollback')
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'publish-archive')

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface Row { id: string; title: string; is_published: boolean; legacy_source_url: string | null }
const numOf = (u: string | null): number | null => {
  const m = (u ?? '').match(/[?&]num=(\d+)/)
  return m ? Number(m[1]) : null
}

async function loadRows(): Promise<Row[]> {
  const { data, error } = await db
    .from('posts')
    .select('id, title, is_published, legacy_source_url')
    .eq('board_type', BOARD_TYPE)
    .like('legacy_source_url', `%boardID=${BOARD_ID}%`)
  if (error) throw new Error(`posts 조회 실패: ${error.message}`)
  return (data ?? []) as Row[]
}

/** 원본 사이트 목록 전 페이지를 읽어 글 번호 → 제목 */
async function originList(): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  let page = 1
  let maxPage = 1
  let guard = 0
  while (page <= maxPage && guard < 40) {
    guard += 1
    const res = await fetchHtml(listUrl(BOARD_ID, page), { force: true })
    if (res.loginWall) throw new Error(`원본 목록 page=${page} 로그인 벽: ${res.loginWall}`)
    const parsed = parseListPage(res.html, page)
    for (const it of parsed.items) out.set(it.num, it.title)
    if (parsed.maxPageSeen > maxPage) maxPage = parsed.maxPageSeen
    page += 1
  }
  return out
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const b = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { rows: Array<{ id: string; is_published: boolean }> }
    let n = 0
    for (const r of b.rows) {
      const { error } = await db.from('posts').update({ is_published: r.is_published }).eq('id', r.id)
      if (error) throw new Error(`복원 실패 ${r.id}: ${error.message}`)
      n += 1
    }
    log(`복원 완료: ${n}건`)
    return
  }

  const rows = await loadRows()
  const withNum = rows.map((r) => ({ ...r, num: numOf(r.legacy_source_url) }))
  const excluded = withNum.filter((r) => r.num !== null && EXCLUDE.has(r.num))
  const targets = withNum.filter((r) => !(r.num !== null && EXCLUDE.has(r.num)))
  const toPublish = targets.filter((r) => !r.is_published)

  log(`교육자료실(${BOARD_ID}) 이관 글: ${rows.length}건 (공개 ${rows.filter((r) => r.is_published).length} / 비공개 ${rows.filter((r) => !r.is_published).length})`)
  log(`제외(${[...EXCLUDE].join(', ')}): ${excluded.length}건`)
  for (const r of excluded) log(`  - #${r.num} ${r.title} (${r.is_published ? '공개' : '비공개'} 유지)`)
  for (const n of EXCLUDE) if (!excluded.some((r) => r.num === n)) log(`  ! #${n} 은 DB 에 없음`)
  log(`공개 대상: ${targets.length}건 중 아직 비공개 ${toPublish.length}건`)

  if (CHECK_ORIGIN) {
    log('\n원본 사이트 목록 확인 중…')
    try {
      const origin = await originList()
      const dbNums = new Set(withNum.map((r) => r.num))
      const fresh = [...origin.entries()].filter(([n]) => !dbNums.has(n)).sort((a, b) => b[0] - a[0])
      const gone = withNum.filter((r) => r.num !== null && !origin.has(r.num))
      log(`원본 글 ${origin.size}건 / DB ${rows.length}건`)
      log(`원본에만 있는 신규 글: ${fresh.length}건`)
      for (const [n, t] of fresh) log(`  + #${n} ${t}`)
      log(`DB 에만 있는 글(원본에서 삭제됨): ${gone.length}건`)
      for (const r of gone) log(`  - #${r.num} ${r.title}`)
    } catch (e) {
      log(`원본 확인 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (!APPLY) {
    log('\ndry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  if (toPublish.length === 0) {
    log('공개로 바꿀 글이 없습니다.')
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(
    backupPath,
    JSON.stringify(
      { createdAt: new Date().toISOString(), exclude: [...EXCLUDE], rows: toPublish.map((r) => ({ id: r.id, num: r.num, title: r.title, is_published: r.is_published })) },
      null,
      2
    )
  )
  const ids = toPublish.map((r) => r.id)
  const { error } = await db.from('posts').update({ is_published: true }).in('id', ids)
  if (error) throw new Error(`공개 전환 실패: ${error.message}`)
  const after = await loadRows()
  log(`완료: ${ids.length}건 공개 → 현재 공개 ${after.filter((r) => r.is_published).length} / 비공개 ${after.filter((r) => !r.is_published).length}. 백업: ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
