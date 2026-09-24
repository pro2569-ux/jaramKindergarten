/**
 * Phase 15. 남은 임시·더미 정보 전수 검색 (읽기 전용) — DB 의 pages/posts/teachers/banners/site_settings/menus 에서
 * 더미 주소·전화·이메일·샘플 문구를 찾아 위치를 보고한다. 값은 바꾸지 않는다.
 *   node scripts/migrate-jaramk/phase15-dummy-scan.ts
 */
import { adminClient } from './lib/supabase-admin.ts'

const PATTERNS: Array<[string, RegExp]> = [
  ['더미 주소(테헤란로)', /테헤란로|강남구/],
  ['더미 전화(1234-5678/5679)', /1234-567[89]|02-000|000-0000/],
  ['더미 이메일', /info@jaramk\.com|example\.com|test@/i],
  ['샘플 문구', /샘플|테스트 (글|게시|앨범)|lorem|Lorem|환영합니다\.?$/],
  ['서울시청 좌표', /37\.5665|126\.978/],
]
const db = adminClient()
const log = (m = '') => process.stdout.write(m + '\n')

async function scan(table: string, select: string, fields: string[], label: (r: Record<string, unknown>) => string): Promise<number> {
  const { data, error } = await db.from(table).select(select)
  if (error) {
    log(`- ${table}: 조회 실패 ${error.message}`)
    return 0
  }
  let hits = 0
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    for (const f of fields) {
      const v = row[f]
      if (typeof v !== 'string' || !v) continue
      for (const [name, re] of PATTERNS) {
        const m = v.match(re)
        if (m) {
          hits += 1
          const at = Math.max(0, (m.index ?? 0) - 30)
          log(`- ${table}.${f} [${label(row)}] ${name}: …${v.slice(at, at + 90).replace(/\s+/g, ' ')}…`)
        }
      }
    }
  }
  return hits
}

async function main(): Promise<void> {
  log('== DB 더미 정보 검색')
  let total = 0
  total += await scan('site_settings', 'key, value', ['value'], (r) => String(r.key))
  total += await scan('pages', 'id, slug, title, content, hero_subtitle, is_published', ['content', 'hero_subtitle', 'title'], (r) => `${r.slug}${r.is_published ? '' : ' (비공개)'}`)
  total += await scan('posts', 'id, board_type, title, content, is_published', ['title', 'content'], (r) => `${r.board_type} «${String(r.title).slice(0, 20)}»${r.is_published ? '' : ' (비공개)'}`)
  total += await scan('teachers', 'id, name, position, introduction, class_name, is_active', ['name', 'introduction', 'class_name'], (r) => `${r.name}/${r.position}${r.is_active ? '' : ' (비활성)'}`)
  total += await scan('banners', 'id, title, link_url, is_active', ['title', 'link_url'], (r) => `${r.title}${r.is_active ? '' : ' (비활성)'}`)
  total += await scan('menus', 'id, label, slug', ['label'], (r) => `${r.slug}`)
  const { data: teachers } = await db.from('teachers').select('name, position, class_name, is_active')
  log(`== teachers 전체 (${(teachers ?? []).length}명): ${(teachers ?? []).map((t) => `${t.name}(${t.position}${t.class_name ? ', ' + t.class_name : ''}${t.is_active ? '' : ', 비활성'})`).join(', ')}`)
  const { data: banners } = await db.from('banners').select('title, image_url, is_active')
  log(`== banners 전체 (${(banners ?? []).length}건): ${(banners ?? []).map((b) => `${b.title ?? '(제목 없음)'}${b.is_active ? '' : ' (비활성)'} ${String(b.image_url).slice(0, 60)}`).join(' | ')}`)
  const { data: samplePosts } = await db.from('posts').select('board_type, title, is_published, created_at').is('legacy_source_url', null).order('created_at')
  log(`== 이관이 아닌 게시글 (${(samplePosts ?? []).length}건): ${(samplePosts ?? []).map((p) => `${p.board_type} «${p.title}»${p.is_published ? '' : ' (비공개)'}`).join(' | ')}`)
  log(`\n합계 ${total}건`)
}

main().catch((e: unknown) => {
  console.error('실패:', e instanceof Error ? e.message : e)
  process.exit(1)
})
