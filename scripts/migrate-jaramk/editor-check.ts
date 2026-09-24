/**
 * admin 편집기 호환 검사 — 디자인 블록 HTML(scripts/migrate-jaramk/pagemaker-text/*.html)을 편집기에서 열고 저장해도 깨지지 않는지.
 *   node --no-warnings scripts/migrate-jaramk/editor-check.ts [--dir <폴더>]
 *
 * 검사 항목 (페이지마다)
 *  1. 소스 모드: RichTextEditor 가 "HTML 소스" 모드로 여는 조건(/<table|<div|<figure|class="/)에 걸리는지 → 걸리면 WYSIWYG 파서가 손대지 않는다
 *  2. 저장 보존: 소스 모드에서 그대로 저장하면 렌더 시 lib/sanitize.ts 를 거친다 → sanitize 가 멱등이고 텍스트·class 가 보존되는지
 *  3. (참고) WYSIWYG 모드로 억지로 전환했을 때 TipTap(StarterKit+Image, 편집기와 같은 구성) 왕복에서 무엇이 사라지는지 — 경고 문구의 근거
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateHTML, generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import * as cheerio from 'cheerio'
import { REPO_ROOT } from './lib/paths.ts'
import { sanitizeHtml } from '../../lib/sanitize.ts'

const args = process.argv.slice(2)
const dirIdx = args.indexOf('--dir')
const DIR = dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1]! : join(REPO_ROOT, 'scripts', 'migrate-jaramk', 'pagemaker-text')
/** RichTextEditor.tsx 의 소스 모드 진입 조건과 같아야 한다 */
const HTML_MODE = /<table|<div|<figure|class="/i
/** RichTextEditor.tsx 와 같은 확장 구성 (StarterKit 에 link 포함) */
const extensions = [StarterKit.configure({ link: { openOnClick: false } }), Image]

const textOf = (html: string) =>
  cheerio.load(html.replace(/<(?!\/?(?:small|strong|b|em|i|u|s|a|sup|sub|mark)\b)/gi, ' <'), null, false).root().text().replace(/\s+/g, ' ').trim()
const classesOf = (html: string) => {
  const $ = cheerio.load(html, null, false)
  const set = new Set<string>()
  $('[class]').each((_, el) => {
    for (const c of ($(el).attr('class') ?? '').split(/\s+/).filter(Boolean)) set.add(c)
  })
  return set
}
const tagCount = (html: string, tag: string) => (html.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length

let bad = 0
const files = readdirSync(DIR).filter((f) => f.endsWith('.html')).sort((a, b) => Number(a.replace('.html', '')) - Number(b.replace('.html', '')))
console.log(`검사 대상 ${files.length}개 (${DIR})\n`)
for (const f of files) {
  const html = readFileSync(join(DIR, f), 'utf8')
  const problems: string[] = []

  // 1) 소스 모드
  const opensAsSource = HTML_MODE.test(html)
  if (!opensAsSource) problems.push('소스 모드 조건에 안 걸림 (WYSIWYG 로 열려 디자인이 풀릴 수 있음)')

  // 2) 저장 보존 (sanitize 멱등 + 텍스트·class 보존)
  const once = sanitizeHtml(html)
  const twice = sanitizeHtml(once)
  if (once !== twice) problems.push('sanitize 가 멱등이 아님')
  if (textOf(once) !== textOf(html)) problems.push('sanitize 후 텍스트가 달라짐')
  const before = classesOf(html)
  const after = classesOf(once)
  const lostClasses = [...before].filter((c) => !after.has(c))
  if (lostClasses.length) problems.push(`sanitize 가 class 를 제거: ${lostClasses.join(', ')}`)

  // 3) WYSIWYG 왕복 (참고)
  let wysiwygNote = ''
  try {
    const json = generateJSON(html, extensions)
    const back = generateHTML(json, extensions)
    const lost = [...before].filter((c) => !classesOf(back).has(c))
    const textLost = textOf(back) !== textOf(html)
    wysiwygNote = `WYSIWYG 전환 시: class ${lost.length}/${before.size}개 소실, div ${tagCount(html, 'div')}→${tagCount(back, 'div')}, table ${tagCount(html, 'table')}→${tagCount(back, 'table')}${textLost ? ', 텍스트 일부 변경' : ', 텍스트는 보존'}`
  } catch (e) {
    wysiwygNote = `WYSIWYG 왕복 실패: ${e instanceof Error ? e.message : String(e)}`
  }

  const ok = problems.length === 0
  if (!ok) bad++
  console.log(`${ok ? '✓' : '✗'} ${f.padEnd(8)} 소스모드 ${opensAsSource ? 'O' : 'X'} | 저장 보존 ${problems.length ? 'X' : 'O'} | ${wysiwygNote}`)
  for (const p of problems) console.log(`      - ${p}`)
}
console.log(`\n결과: ${files.length - bad}/${files.length} 통과 (소스 모드로 열리고, 그대로 저장해도 텍스트·class 보존)`)
process.exitCode = bad ? 1 : 0
