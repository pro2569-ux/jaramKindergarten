/**
 * Phase 16. 개인정보처리방침 페이지(pages.slug=privacy) 게시 — 초안 HTML(info-pages/privacy.html)을 CMS 페이지로 넣는다.
 *   node scripts/migrate-jaramk/phase16-privacy-page.ts                     dry-run(기본)
 *   node scripts/migrate-jaramk/phase16-privacy-page.ts --apply             생성 또는 갱신 (기존 행은 백업)
 *   node scripts/migrate-jaramk/phase16-privacy-page.ts --rollback <백업.json>   백업 값으로 되돌리기 (이 스크립트가 만든 행은 삭제)
 * 페이지는 메뉴에 넣지 않고 /privacy 라우트(푸터 링크)가 slug 로 읽는다. 관리자 > 페이지에서 계속 수정 가능.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'

const APPLY = process.argv.includes('--apply')
const ROLLBACK_IDX = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? (process.argv[ROLLBACK_IDX + 1] ?? null) : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'privacy-page')
const HTML_FILE = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'info-pages', 'privacy.html')
const SLUG = 'privacy'

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

interface PageRow { id: string; slug: string; title: string; content: string | null; page_type: string; category: string; is_published: boolean; layout_config: Record<string, unknown> | null }

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 파일 없음: ${ROLLBACK_FILE}`)
    const b = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { row: PageRow | null; createdId: string | null }
    if (b.createdId) {
      const { error } = await db.from('pages').delete().eq('id', b.createdId)
      if (error) throw new Error(`삭제 실패: ${error.message}`)
      log(`생성했던 페이지 삭제: ${b.createdId}`)
    } else if (b.row) {
      const { error } = await db.from('pages').update({ title: b.row.title, content: b.row.content, is_published: b.row.is_published }).eq('id', b.row.id)
      if (error) throw new Error(`복원 실패: ${error.message}`)
      log(`복원: ${b.row.slug}`)
    }
    return
  }

  const html = readFileSync(HTML_FILE, 'utf8')
  const content = sanitizeHtml(html)
  if (sanitizeHtml(content) !== content) throw new Error('본문이 sanitize 를 멱등으로 통과하지 못함')
  const pending = (content.match(/확인 필요/g) ?? []).length
  const { data: existing, error } = await db.from('pages').select('id, slug, title, content, page_type, category, is_published, layout_config').eq('slug', SLUG).maybeSingle()
  if (error) throw new Error(`pages 조회 실패: ${error.message}`)
  log(`초안: ${content.length}자, [확인 필요] 표시 ${pending}곳`)
  log(existing ? `기존 페이지 있음 (${existing.id}, ${existing.is_published ? '공개' : '비공개'}, ${(existing.content ?? '').length}자) → 본문 갱신` : '기존 페이지 없음 → 생성 (single, category about, 공개, 메뉴 없음)')
  if (!APPLY) {
    log('dry-run 입니다 (DB 변경 없음). 반영하려면 --apply')
    return
  }
  const backupPath = join(OUT, `backup-${stamp()}.json`)
  if (existing) {
    writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), row: existing, createdId: null }, null, 2))
    const { error: e } = await db.from('pages').update({ title: '개인정보처리방침', content, is_published: true }).eq('id', existing.id)
    if (e) throw new Error(`갱신 실패: ${e.message}`)
    log(`갱신 완료. 백업: ${backupPath}`)
  } else {
    const { data, error: e } = await db
      .from('pages')
      .insert({ slug: SLUG, title: '개인정보처리방침', content, category: 'about', page_type: 'single', layout_config: { width: 'medium' }, style_config: {}, is_published: true, sort_order: 999 })
      .select('id')
      .single()
    if (e || !data) throw new Error(`생성 실패: ${e?.message}`)
    writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), row: null, createdId: (data as { id: string }).id }, null, 2))
    log(`생성 완료 (${(data as { id: string }).id}). 백업: ${backupPath}`)
  }
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
