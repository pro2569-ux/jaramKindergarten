/**
 * 탐색용 CLI: 주어진 URL 들을 (캐시/속도제한 규칙대로) 가져와 구조 요약을 출력한다.
 *   node scripts/migrate-jaramk/fetch-url.ts <url> [<url> ...] [--links] [--html] [--grep <regex>]
 */
import * as cheerio from 'cheerio'
import { fetchHtml, decodeFontImageLabel, stats, log } from './lib/http.ts'

const args = process.argv.slice(2)
const showLinks = args.includes('--links')
const showHtml = args.includes('--html')
const grepIdx = args.indexOf('--grep')
const grep = grepIdx >= 0 ? new RegExp(args[grepIdx + 1] ?? '', 'i') : null
const urls = args.filter((a, i) => !a.startsWith('--') && (grepIdx < 0 || i !== grepIdx + 1))

function classify(href: string): string {
  if (/boardID=.*Mode=view/i.test(href)) return 'post-view'
  if (/boardID=/i.test(href)) return 'board'
  if (/pageCode=/i.test(href)) return 'page'
  if (/mstrCode=/i.test(href)) return 'category'
  if (/saveDir|download|fileDown|\.(?:pdf|hwp|docx?|xlsx?|pptx?|zip)(?:$|\?)/i.test(href)) return 'file'
  if (/page=|pageNum|pageNo|curPage|start=/i.test(href)) return 'pagination'
  if (/^javascript:/i.test(href)) return 'js'
  return 'other'
}

for (const url of urls) {
  const res = await fetchHtml(url)
  const $ = cheerio.load(res.html)
  console.log('='.repeat(100))
  console.log(`URL      : ${res.url}`)
  console.log(`final    : ${res.finalUrl}`)
  console.log(`status   : ${res.status}  bytes=${res.bytes}  charset=${res.charset}  cache=${res.fromCache}`)
  console.log(`title    : ${$('title').text().trim()}`)

  const groups = new Map<string, Set<string>>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    const imgLabel = $(el).find('img').map((__, img) => decodeFontImageLabel($(img).attr('src') ?? '') ?? '').get().filter(Boolean).join('|')
    const kind = classify(href)
    if (!groups.has(kind)) groups.set(kind, new Set())
    groups.get(kind)!.add(`${href}  «${text || imgLabel}»`)
  })
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    if (/core\/(design|fonts|module)/.test(src)) return
    if (!groups.has('img')) groups.set('img', new Set())
    groups.get('img')!.add(src)
  })
  $('form').each((_, el) => {
    if (!groups.has('form')) groups.set('form', new Set())
    groups.get('form')!.add(`${$(el).attr('method') ?? 'GET'} ${$(el).attr('action') ?? ''} names=${$(el).find('[name]').map((__, i) => $(i).attr('name')).get().join(',')}`)
  })
  for (const [kind, set] of groups) {
    console.log(`-- ${kind} (${set.size})`)
    if (showLinks || kind !== 'js') {
      for (const line of [...set].slice(0, showLinks ? 500 : 40)) console.log(`   ${line}`)
    }
  }
  if (grep) {
    console.log(`-- grep ${grep}`)
    res.html.split(/\r?\n/).forEach((line, i) => {
      if (grep.test(line)) console.log(`   ${i + 1}: ${line.trim().slice(0, 300)}`)
    })
  }
  if (showHtml) {
    console.log('-- html')
    console.log(res.html)
  }
}
log(`요청 통계: network=${stats.network} cached=${stats.cached} failed=${stats.failed}`)
