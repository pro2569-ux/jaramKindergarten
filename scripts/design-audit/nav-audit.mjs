#!/usr/bin/env node
/**
 * 메뉴 ↔ 페이지 내비 일치 점검 — 헤더 메뉴의 모든 항목(3단 포함)을 실제로 열어
 * 사이드바 그룹/활성 항목, 상단 띠(breadcrumb), 헤더 활성 대분류가 누른 메뉴와 같은지 표로 확인한다.
 *   node scripts/design-audit/nav-audit.mjs --base <url> --out <dir> [--extra <rows.json>] [--port 9342]
 * extra rows (게시글 상세 등 메뉴에 없는 경로):
 *   [{ "path": "/board/notice/<id>", "section": "커뮤니티", "item": "공지사항", "label": "공지사항 글 상세" }]
 * 결과: 콘솔 표 + <out>/nav-audit.md. 불일치가 있으면 exit 1.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def
}
const BASE = (opt('base', 'http://127.0.0.1:3000')).replace(/\/+$/, '')
const OUT = path.resolve(opt('out', 'scripts/design-audit/screenshots/nav-audit'))
const EXTRA = opt('extra', null)
const PORT = opt('port', '9342')
const CAPTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'capture.mjs')
mkdirSync(OUT, { recursive: true })

// 1) 메뉴 트리 → 기대값 행
const menus = await (await fetch(`${BASE}/api/menus`)).json()
const rows = []
for (const top of menus) {
  for (const child of top.children ?? []) {
    if (child.children && child.children.length) {
      for (const leaf of child.children) rows.push({ path: leaf.href, section: top.name, group: child.name, item: leaf.name, label: `${top.name} > ${child.name} > ${leaf.name}` })
    } else {
      rows.push({ path: child.href, section: top.name, group: null, item: child.name, label: `${top.name} > ${child.name}` })
    }
  }
}
if (EXTRA) {
  for (const r of JSON.parse(readFileSync(EXTRA, 'utf8'))) rows.push({ group: null, label: `${r.section} > ${r.item} (${r.note || '상세'})`, ...r })
}
const seen = new Set()
const unique = rows.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true)))

// 2) 캡처 (PC) 로 실제 DOM 값 수집
const pages = unique.map((r, i) => ({ path: r.path, name: `nav-${String(i).padStart(2, '0')}`, viewports: ['pc'] }))
const pagesFile = path.join(OUT, 'pages.json')
writeFileSync(pagesFile, JSON.stringify(pages, null, 2))
const run = spawnSync(process.execPath, [CAPTURE, '--base', BASE, '--out', OUT, '--pages', pagesFile, '--viewports', 'pc', '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })
const captureLog = (run.stdout || '').split('\n').filter((l) => /완료|실패/.test(l)).join('\n')
console.log(captureLog)
const metrics = JSON.parse(readFileSync(path.join(OUT, 'metrics.json'), 'utf8'))
const byFile = new Map(metrics.map((m) => [m.file, m]))

// 3) 비교
const cell = (v) => (v == null || v === '' ? '—' : v)
const mark = (ok, v) => (ok ? cell(v) : `❌ ${cell(v)}`)
const lines = ['| 메뉴 | 경로 | 사이드바 그룹 | 사이드바 활성 | breadcrumb | 헤더 활성 | 결과 |', '|---|---|---|---|---|---|---|']
let bad = 0
for (const [i, r] of unique.entries()) {
  const m = byFile.get(`pc_nav-${String(i).padStart(2, '0')}.png`)
  const nav = (m && m.nav) || {}
  const okTitle = nav.sidebarTitle === r.section
  const okActive = nav.sidebarActive === r.item
  const okGroup = r.group ? nav.sidebarGroup === r.group : true
  const okEyebrow = nav.eyebrow === r.section
  const okHeader = nav.headerActive === r.section
  const ok = okTitle && okActive && okGroup && okEyebrow && okHeader
  if (!ok) bad++
  const groupCell = r.group ? mark(okGroup, nav.sidebarGroup) : cell(nav.sidebarGroup)
  lines.push(`| ${r.label} | \`${r.path}\` | ${mark(okTitle, nav.sidebarTitle)}${r.group ? ' › ' + groupCell : ''} | ${mark(okActive, nav.sidebarActive)} | ${mark(okEyebrow, nav.eyebrow)} | ${mark(okHeader, nav.headerActive)} | ${ok ? '일치' : '불일치'} |`)
}
const summary = `점검 ${unique.length}경로 → 일치 ${unique.length - bad}, 불일치 ${bad} (${BASE})`
const md = `# 메뉴 내비 점검 — ${new Date().toISOString()}\n\n${summary}\n\n${lines.join('\n')}\n`
writeFileSync(path.join(OUT, 'nav-audit.md'), md)
console.log('\n' + lines.join('\n'))
console.log('\n' + summary + `\n→ ${path.join(OUT, 'nav-audit.md')}`)
process.exitCode = bad ? 1 : 0
