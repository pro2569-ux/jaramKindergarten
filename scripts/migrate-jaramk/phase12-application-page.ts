/**
 * Phase 12. 입소신청서를 입학안내 아래 독립 CMS 페이지로 —
 *   pages(application-form) 를 링크 페이지(redirectTo → 공지사항 글)에서 본문이 있는 single 페이지로 바꾸고,
 *   기존 공지사항 글(입소신청서)은 목록에 중복으로 보이지 않게 비공개로 돌린다. 옛 글 경로의 리다이렉트는 next.config 에서.
 *   node scripts/migrate-jaramk/phase12-application-page.ts                     dry-run(기본)
 *   node scripts/migrate-jaramk/phase12-application-page.ts --apply             반영 (반영 전에 두 행을 백업)
 *   node scripts/migrate-jaramk/phase12-application-page.ts --rollback <백업.json>   두 행을 백업 값으로 되돌리기
 * 원칙: 이 두 행 외에는 건드리지 않는다 (다른 글·앨범 공개 상태 불변)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'application-page')
const HTML_FILE = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'info-pages', 'application-form.html')

const PAGE_SLUG = 'application-form'
/** 입소신청서 이관 글 (posts, boardID www49) */
const POST_ID = '86fb8f3b-2ce5-4f09-b447-57fda6c0924d'

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface PageRow { id: string; slug: string; title: string; content: string | null; page_type: string; layout_config: Record<string, unknown> | null; is_published: boolean }
interface PostRow { id: string; title: string; board_type: string; is_published: boolean }

async function load(): Promise<{ page: PageRow; post: PostRow }> {
  const { data: page, error: e1 } = await db.from('pages').select('id, slug, title, content, page_type, layout_config, is_published').eq('slug', PAGE_SLUG).maybeSingle()
  if (e1) throw new Error(`pages 조회 실패: ${e1.message}`)
  if (!page) throw new Error(`pages.slug=${PAGE_SLUG} 없음`)
  const { data: post, error: e2 } = await db.from('posts').select('id, title, board_type, is_published').eq('id', POST_ID).maybeSingle()
  if (e2) throw new Error(`posts 조회 실패: ${e2.message}`)
  if (!post) throw new Error(`posts.id=${POST_ID} 없음`)
  return { page: page as PageRow, post: post as PostRow }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const b = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { page: PageRow; post: PostRow }
    const { error: e1 } = await db.from('pages').update({ content: b.page.content, page_type: b.page.page_type, layout_config: b.page.layout_config, is_published: b.page.is_published }).eq('id', b.page.id)
    if (e1) throw new Error(`pages 복원 실패: ${e1.message}`)
    const { error: e2 } = await db.from('posts').update({ is_published: b.post.is_published }).eq('id', b.post.id)
    if (e2) throw new Error(`posts 복원 실패: ${e2.message}`)
    log(`복원: pages ${b.page.slug} (layout_config ${JSON.stringify(b.page.layout_config)}), posts «${b.post.title}» is_published=${b.post.is_published}`)
    return
  }

  const { page, post } = await load()
  const html = readFileSync(HTML_FILE, 'utf8')
  const after = sanitizeHtml(html)
  if (sanitizeHtml(after) !== after) throw new Error('새 본문이 sanitize 를 멱등으로 통과하지 못함')
  const lc = { ...(page.layout_config ?? {}) }
  delete lc.redirectTo

  log(`pages ${page.slug} «${page.title}»: ${page.page_type}, ${page.is_published ? '공개' : '비공개'}, layout_config ${JSON.stringify(page.layout_config)}, 본문 ${(page.content ?? '').length}자`)
  log(`posts «${post.title}» (${post.board_type}): ${post.is_published ? '공개' : '비공개'}`)
  log(`→ pages: single, 공개, layout_config ${JSON.stringify(lc)}, 본문 ${after.length}자 (입소신청서 안내 + hwp 다운로드 버튼)`)
  log(`→ posts: 비공개 (공지사항 목록에서 숨김; 옛 경로 /board/notice/${POST_ID} 는 next.config 리다이렉트)`)
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), page, post }, null, 2))
  log(`백업 저장: ${backupPath}`)
  const { error: e1 } = await db.from('pages').update({ content: after, page_type: 'single', layout_config: lc, is_published: true }).eq('id', page.id)
  if (e1) throw new Error(`pages 반영 실패: ${e1.message}`)
  const { error: e2 } = await db.from('posts').update({ is_published: false }).eq('id', post.id)
  if (e2) throw new Error(`posts 반영 실패: ${e2.message}`)
  const now = await load()
  log(`완료: pages ${now.page.slug} ${now.page.page_type}/${now.page.is_published ? '공개' : '비공개'} layout_config ${JSON.stringify(now.page.layout_config)}; posts is_published=${now.post.is_published}. 되돌리기: --rollback ${backupPath}`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
