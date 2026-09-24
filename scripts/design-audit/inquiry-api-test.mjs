#!/usr/bin/env node
/**
 * 문의 접수 API 검증 — 거부 조건(미동의·허니팟·너무 빠른 제출)과 정상 접수를 실제 호출로 확인한다.
 *   node scripts/design-audit/inquiry-api-test.mjs --base http://localhost:3131 [--submit]
 * --submit 이 없으면 거부 조건만 검사한다. --submit 이면 "[테스트] API 접수 확인" 제목으로 1건 실제 저장한다
 * (확인 후 scripts/migrate-jaramk/inquiry-test-cleanup.ts --delete 로 지운다).
 */
const args = process.argv.slice(2)
const i = args.indexOf('--base')
const BASE = (i >= 0 ? args[i + 1] : 'http://127.0.0.1:3000').replace(/\/+$/, '')
const SUBMIT = args.includes('--submit')
const base = {
  author_name: '테스트',
  author_email: 'test@example.com',
  author_phone: '010-0000-0000',
  title: '[테스트] API 접수 확인',
  content: '자동 검증용 테스트 문의입니다. 확인 후 삭제합니다.',
}
const post = async (body) => {
  const res = await fetch(`${BASE}/api/inquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let json = {}
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}
const old = Date.now() - 5000
const cases = [
  ['미동의', { ...base, consent: false, startedAt: old }, 400],
  ['허니팟 채움', { ...base, consent: true, company: 'spam', startedAt: old }, 400],
  ['3초 안에 제출', { ...base, consent: true, startedAt: Date.now() }, 400],
  ['내용 10자 미만', { ...base, content: '짧음', consent: true, startedAt: old }, 400],
  ['이메일 형식 오류', { ...base, author_email: 'nope', consent: true, startedAt: old }, 400],
]
if (SUBMIT) cases.push(['정상 접수', { ...base, consent: true, startedAt: old }, 201])
let bad = 0
for (const [name, body, expect] of cases) {
  const r = await post(body)
  const ok = r.status === expect
  if (!ok) bad++
  console.log(`${ok ? '✓' : '✗'} ${name}: ${r.status} (기대 ${expect}) ${r.json.error ?? ''} ${r.json.errors ? JSON.stringify(r.json.errors) : ''}`)
}
console.log(bad ? `실패 ${bad}건` : '모두 통과')
process.exitCode = bad ? 1 : 0
