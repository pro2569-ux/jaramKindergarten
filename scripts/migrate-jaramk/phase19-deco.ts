/**
 * Phase 19. 정보·프로그램 페이지에 편지지 장식 적용 (본문 글자는 그대로).
 *   node --no-warnings scripts/migrate-jaramk/phase19-deco.ts                 dry-run: 페이지별 계획 + 글자 보존 검사
 *   node --no-warnings scripts/migrate-jaramk/phase19-deco.ts --apply         백업 JSON 저장 후 반영
 *   node --no-warnings scripts/migrate-jaramk/phase19-deco.ts --rollback <백업.json>
 *   node --no-warnings scripts/migrate-jaramk/phase19-deco.ts --remove --apply  장식만 걷어내기 (백업 후)
 * 넣는 것: 맨 앞 모서리 장식 <div class="deco-corner deco-corner--X" aria-hidden="true"></div>,
 *          h2 에 제목 아이콘 클래스 t-Y, 맨 끝 하단 풍경 <div class="deco-scene deco-scene--Z" aria-hidden="true"></div>.
 * 다시 실행해도 겹치지 않는다(기존 장식을 먼저 걷어냄). 인사말은 전용 렌더러에서 코드로 적용.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminClient } from './lib/supabase-admin.ts'
import { REPO_ROOT } from './lib/paths.ts'

const APPLY = process.argv.includes('--apply')
const REMOVE = process.argv.includes('--remove')
const RB = process.argv.indexOf('--rollback')
const ROLLBACK_FILE = RB >= 0 ? process.argv[RB + 1] ?? null : null
const OUT = join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'data', 'out', 'deco')

/** slug → [모서리, 제목 아이콘, 하단 풍경] — 옛 사이트의 장식 위치·소재를 참고해 페이지 내용에 맞춤 */
const PLAN: Record<string, [string, string, string]> = {
  'legacy-philosophy': ['leaves', 'sprout', 'books'],
  teachers: ['stars', 'star', 'village'],
  'legacy-environment': ['butterfly', 'house', 'house'],
  'legacy-facilities': ['leaves', 'leaf', 'house'],
  'legacy-standard': ['hearts', 'book', 'books'],
  'legacy-nuri': ['stars', 'pencil', 'rainbow'],
  'legacy-forest': ['leaves', 'tree', 'forest'],
  farm: ['leaves', 'sprout', 'garden'],
  fitness: ['flowers', 'ball', 'play'],
  'seasonal-customs': ['clouds', 'kite', 'festival'],
  'outdoor-walk': ['butterfly', 'butterfly', 'breeze'],
  'creative-tools': ['stars', 'star', 'rainbow'],
  'happy-project': ['hearts', 'heart', 'meadow'],
  'nasa-creca': ['stars', 'star', 'play'],
  'parents-storytelling': ['clouds', 'book', 'books'],
  'reading-coaching': ['hearts', 'book', 'books'],
  'special-activities': ['stars', 'star', 'play'],
  events: ['flowers', 'flower', 'village'],
  'adaptation-guide': ['clouds', 'sprout', 'meadow'],
  'application-form': ['flowers', 'letter', 'meadow'],
}

const log = (m = '') => process.stdout.write(m + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const db = adminClient()

/** 기존 장식 걷어내기 */
function strip(html: string): string {
  return html
    .replace(/<div class="deco-(?:corner|scene)[^"]*"[^>]*>\s*<\/div>\s*/g, '')
    .replace(/<h2([^>]*?)\sclass="([^"]*)"/g, (m, pre: string, cls: string) => {
      const kept = cls.split(/\s+/).filter((c) => c && !/^t-[a-z]+$/.test(c))
      return kept.length ? `<h2${pre} class="${kept.join(' ')}"` : `<h2${pre}`
    })
}

function decorate(html: string, [corner, icon, scene]: [string, string, string]): string {
  const withIcons = html.replace(/<h2(\s[^>]*)?>/g, (m, attrs: string | undefined) => {
    const a = attrs ?? ''
    if (/\sclass="/.test(a)) return `<h2${a.replace(/\sclass="([^"]*)"/, (_x, c: string) => ` class="t-${icon} ${c}"`)}>`
    return `<h2 class="t-${icon}"${a}>`
  })
  return `<div class="deco-corner deco-corner--${corner}" aria-hidden="true"></div>${withIcons.trim()}<div class="deco-scene deco-scene--${scene}" aria-hidden="true"></div>`
}

/** 글자 보존 검사용: 태그를 걷어낸 글자 */
const textOf = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  if (ROLLBACK_FILE) {
    if (!existsSync(ROLLBACK_FILE)) throw new Error(`백업 없음: ${ROLLBACK_FILE}`)
    const b = JSON.parse(readFileSync(ROLLBACK_FILE, 'utf8')) as { rows: Array<{ id: string; content: string }> }
    for (const r of b.rows) {
      const { error } = await db.from('pages').update({ content: r.content }).eq('id', r.id)
      if (error) throw new Error(`복원 실패 ${r.id}: ${error.message}`)
    }
    log(`복원 완료: ${b.rows.length}건`)
    return
  }
  const { data, error } = await db.from('pages').select('id, slug, title, content').in('slug', Object.keys(PLAN))
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ id: string; slug: string; title: string; content: string | null }>
  const missing = Object.keys(PLAN).filter((s) => !rows.some((r) => r.slug === s))
  if (missing.length) log(`! DB 에 없는 slug: ${missing.join(', ')}`)
  const changes: Array<{ id: string; slug: string; before: string; after: string }> = []
  for (const r of rows) {
    const before = r.content ?? ''
    const base = strip(before)
    const after = REMOVE ? base : decorate(base, PLAN[r.slug])
    const same = textOf(before) === textOf(after)
    const h2 = (after.match(/<h2[\s>]/g) || []).length
    log(`- ${r.slug.padEnd(22)} ${r.title} | ${REMOVE ? '장식 제거' : PLAN[r.slug].join(' / ')} | h2 ${h2}개 | 글자 보존 ${same ? 'OK' : '불일치!'}${before === after ? ' (변경 없음)' : ''}`)
    if (!same) throw new Error(`${r.slug}: 글자가 달라졌습니다 — 중단`)
    if (before !== after) changes.push({ id: r.id, slug: r.slug, before, after })
  }
  if (!APPLY) { log(`\ndry-run (DB 변경 없음). 바뀔 페이지 ${changes.length}건. 반영: --apply`); return }
  if (!changes.length) { log('바꿀 페이지가 없습니다.'); return }
  const backup = join(OUT, `backup-${stamp()}.json`)
  writeFileSync(backup, JSON.stringify({ createdAt: new Date().toISOString(), rows: changes.map((c) => ({ id: c.id, slug: c.slug, content: c.before })) }, null, 2))
  for (const c of changes) {
    const { error: e } = await db.from('pages').update({ content: c.after }).eq('id', c.id)
    if (e) throw new Error(`반영 실패 ${c.slug}: ${e.message} (백업: ${backup})`)
  }
  log(`완료: ${changes.length}건. 백업: ${backup}`)
}

main().catch((e: unknown) => { console.error('실패:', e instanceof Error ? e.message : e); process.exit(1) })
