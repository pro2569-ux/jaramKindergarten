import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 문의 접수 (POST). 서버에서 검증·동의 확인·간단한 스팸 방어를 하고 inquiries 에 저장한다.
 * - 개인정보 수집·이용 동의(consent) 없이는 저장하지 않는다
 * - 허니팟(company) 이 채워졌거나, 폼을 연 지 3초가 안 됐으면 봇으로 보고 거절
 * - 같은 IP 는 10분에 5건까지 (인스턴스 메모리 기준 — 완전한 제한은 아니고 급격한 남용만 막는다)
 * - 저장은 세션 없는 anon 클라이언트로 (RLS: 신규 접수만 허용). 문의는 관리자·교사만 읽을 수 있다
 */
const LIMITS = { name: 50, email: 100, phone: 20, title: 100, content: 3000 } as const
const MIN_CONTENT = 10
const MIN_ELAPSED_MS = 3000
const RATE = { windowMs: 10 * 60 * 1000, max: 5 }
const recent = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE.windowMs)
  if (hits.length >= RATE.max) {
    recent.set(ip, hits)
    return true
  }
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()
  return false
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  // 봇 방어
  if (str(body.company, 200)) return NextResponse.json({ error: '접수할 수 없습니다.' }, { status: 400 })
  const startedAt = typeof body.startedAt === 'number' ? body.startedAt : NaN
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_ELAPSED_MS) {
    return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 400 })
  }
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: '문의가 너무 자주 접수되었습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })

  // 검증
  const errors: Record<string, string> = {}
  const author_name = str(body.author_name, LIMITS.name)
  const author_email = str(body.author_email, LIMITS.email)
  const author_phone = str(body.author_phone, LIMITS.phone)
  const title = str(body.title, LIMITS.title)
  const content = str(body.content, LIMITS.content)
  const consent = body.consent === true
  if (!author_name) errors.author_name = '이름을 입력해주세요.'
  if (!author_email) errors.author_email = '이메일을 입력해주세요.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) errors.author_email = '올바른 이메일 형식이 아닙니다.'
  if (!author_phone) errors.author_phone = '연락처를 입력해주세요.'
  else if (!/^[0-9-]+$/.test(author_phone)) errors.author_phone = '올바른 연락처 형식이 아닙니다.'
  if (!title) errors.title = '제목을 입력해주세요.'
  if (!content) errors.content = '문의 내용을 입력해주세요.'
  else if (content.length < MIN_CONTENT) errors.content = `문의 내용은 최소 ${MIN_CONTENT}자 이상 입력해주세요.`
  if (!consent) errors.consent = '개인정보 수집·이용에 동의해야 문의를 접수할 수 있습니다.'
  if (Object.keys(errors).length) return NextResponse.json({ error: '입력 내용을 확인해주세요.', errors }, { status: 400 })

  try {
    const supabase = await createClient()
    const row = { author_name, author_email, author_phone, title, content, is_private: true, status: 'pending' as const }
    // consent_at 컬럼은 20260924100000_launch_security.sql 로 추가된다 — 아직 없으면 컬럼 없이 저장하고 로그만 남긴다
    let { error } = await supabase.from('inquiries').insert([{ ...row, consent_at: new Date().toISOString() }])
    if (error && /consent_at/.test(error.message)) {
      console.warn('[inquiries] consent_at 컬럼이 아직 없습니다 — 보안 SQL(20260924100000_launch_security.sql)을 실행하세요')
      ;({ error } = await supabase.from('inquiries').insert([row]))
    }
    if (error) {
      console.error('[inquiries] insert 실패:', error.message)
      return NextResponse.json({ error: '문의 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error('[inquiries] 예외:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '문의 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
}
