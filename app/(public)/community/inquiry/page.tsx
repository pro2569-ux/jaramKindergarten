'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import { staticSectionNav } from '@/lib/site-nav'
import { MessageCircle, Send } from 'lucide-react'

// 클라이언트 컴포넌트라 DB 메뉴 대신 정적 목록 사용 (community 대분류는 DB 에 소분류가 없음)
const nav = staticSectionNav('community')

const EMPTY = { author_name: '', author_email: '', author_phone: '', title: '', content: '', consent: false, company: '' }

export default function InquiryPage() {
  const [formData, setFormData] = useState(EMPTY)
  // 폼을 연 시각 (서버가 너무 빠른 제출을 봇으로 거른다)
  const [startedAt] = useState(() => Date.now())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!formData.author_name.trim()) next.author_name = '이름을 입력해주세요.'
    if (!formData.author_email.trim()) next.author_email = '이메일을 입력해주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.author_email)) next.author_email = '올바른 이메일 형식이 아닙니다.'
    if (!formData.author_phone.trim()) next.author_phone = '연락처를 입력해주세요.'
    else if (!/^[0-9-]+$/.test(formData.author_phone)) next.author_phone = '올바른 연락처 형식이 아닙니다.'
    if (!formData.title.trim()) next.title = '제목을 입력해주세요.'
    if (!formData.content.trim()) next.content = '문의 내용을 입력해주세요.'
    else if (formData.content.trim().length < 10) next.content = '문의 내용은 최소 10자 이상 입력해주세요.'
    if (!formData.consent) next.consent = '개인정보 수집·이용에 동의해야 문의를 접수할 수 있습니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, startedAt }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string> }
      if (!res.ok) {
        setErrors({ ...(data.errors ?? {}), submit: data.error ?? '문의 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
        return
      }
      setIsSubmitted(true)
      setFormData(EMPTY)
    } catch {
      setErrors((prev) => ({ ...prev, submit: '문의 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const shellProps = {
    eyebrow: nav.label,
    title: '문의하기',
    subtitle: '궁금하신 사항을 남겨주시면 성심껏 답변해드리겠습니다',
    sidebar: <SideNav title={nav.label} items={nav.items} />,
    width: 'reading' as const,
    card: false,
  }

  if (isSubmitted) {
    return (
      <PageShell {...shellProps}>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-tint">
              <MessageCircle className="h-8 w-8 text-primary-ink" aria-hidden="true" />
            </div>
            <h2 className="typo-h2 mb-2 text-heading">문의가 접수되었습니다</h2>
            <p className="mb-6 text-muted">
              빠른 시일 내에 남겨주신 연락처로 답변 드리겠습니다.
            </p>
            <Button onClick={() => setIsSubmitted(false)}>추가 문의하기</Button>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell {...shellProps}>
      <Card>
        <CardHeader>
          <CardTitle>문의 작성</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Input label="이름" name="author_name" value={formData.author_name} onChange={handleChange} error={errors.author_name} placeholder="이름을 입력하세요" autoComplete="name" maxLength={50} required />
            <Input label="이메일" type="email" name="author_email" value={formData.author_email} onChange={handleChange} error={errors.author_email} placeholder="example@email.com" autoComplete="email" maxLength={100} required />
            <Input label="연락처" type="tel" name="author_phone" value={formData.author_phone} onChange={handleChange} error={errors.author_phone} placeholder="010-1234-5678" autoComplete="tel" maxLength={20} required />
            <Input label="제목" name="title" value={formData.title} onChange={handleChange} error={errors.title} placeholder="문의 제목을 입력하세요" maxLength={100} required />
            <Textarea label="문의 내용" name="content" value={formData.content} onChange={handleChange} error={errors.content} placeholder="문의 내용을 자세히 입력해주세요 (최소 10자)" rows={8} maxLength={3000} required />

            {/* 허니팟: 사람에게는 보이지 않는다. 채워지면 봇으로 본다 */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="company">회사</label>
              <input id="company" type="text" name="company" value={formData.company} onChange={handleChange} tabIndex={-1} autoComplete="off" />
            </div>

            {/* 개인정보 수집·이용 동의 */}
            <div className="rounded-control border border-border bg-page p-4 text-sm text-body">
              <p className="mb-2 font-semibold text-heading">개인정보 수집·이용 안내</p>
              <ul className="mb-3 list-disc space-y-0.5 pl-5 text-muted">
                <li>수집 항목: 이름, 이메일, 연락처, 문의 제목·내용</li>
                <li>수집 목적: 문의 확인과 답변, 상담 연락</li>
                <li>보유 기간: 문의 처리 완료 후 1년 (이후 지체 없이 파기)</li>
              </ul>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary focus:ring-primary-ink"
                />
                <label htmlFor="consent">
                  위 내용을 확인했으며 개인정보 수집·이용에 동의합니다. (필수){' '}
                  <Link href="/privacy" className="font-medium text-primary-ink underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    개인정보처리방침 보기
                  </Link>
                </label>
              </div>
              {errors.consent && (
                <p id="consent-error" className="mt-2 text-sm text-red-600">{errors.consent}</p>
              )}
              <p className="mt-2 text-xs text-muted">동의하지 않으면 문의를 접수할 수 없습니다. 접수된 문의 내용은 관리자만 볼 수 있습니다.</p>
            </div>

            {errors.submit && <p className="text-center text-sm text-red-600">{errors.submit}</p>}

            <div className="flex justify-center pt-2">
              <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px] gap-2">
                {isSubmitting ? (
                  '등록 중...'
                ) : (
                  <>
                    <Send className="h-5 w-5" aria-hidden="true" />
                    문의 등록
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  )
}
