'use client'

import { useState } from 'react'
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

export default function InquiryPage() {
  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    author_phone: '',
    title: '',
    content: '',
    is_private: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.author_name.trim()) {
      newErrors.author_name = '이름을 입력해주세요.'
    }

    if (!formData.author_email.trim()) {
      newErrors.author_email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.author_email)) {
      newErrors.author_email = '올바른 이메일 형식이 아닙니다.'
    }

    if (!formData.author_phone.trim()) {
      newErrors.author_phone = '연락처를 입력해주세요.'
    } else if (!/^[0-9-]+$/.test(formData.author_phone)) {
      newErrors.author_phone = '올바른 연락처 형식이 아닙니다.'
    }

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.'
    }

    if (!formData.content.trim()) {
      newErrors.content = '문의 내용을 입력해주세요.'
    } else if (formData.content.trim().length < 10) {
      newErrors.content = '문의 내용은 최소 10자 이상 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Supabase에 문의 저장
      // const supabase = createClient()
      // await supabase.from('inquiries').insert([formData])

      // 임시로 성공 처리
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsSubmitted(true)
      setFormData({
        author_name: '',
        author_email: '',
        author_phone: '',
        title: '',
        content: '',
        is_private: false,
      })
    } catch {
      alert('문의 등록 중 오류가 발생했습니다.')
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
              빠른 시일 내에 답변 드리겠습니다.
              <br />
              등록하신 이메일로 답변이 전송됩니다.
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 */}
            <Input
              label="이름"
              name="author_name"
              value={formData.author_name}
              onChange={handleChange}
              error={errors.author_name}
              placeholder="이름을 입력하세요"
              autoComplete="name"
              required
            />

            {/* 이메일 */}
            <Input
              label="이메일"
              type="email"
              name="author_email"
              value={formData.author_email}
              onChange={handleChange}
              error={errors.author_email}
              placeholder="example@email.com"
              autoComplete="email"
              required
            />

            {/* 연락처 */}
            <Input
              label="연락처"
              type="tel"
              name="author_phone"
              value={formData.author_phone}
              onChange={handleChange}
              error={errors.author_phone}
              placeholder="010-1234-5678"
              autoComplete="tel"
              required
            />

            {/* 제목 */}
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              placeholder="문의 제목을 입력하세요"
              required
            />

            {/* 내용 */}
            <Textarea
              label="문의 내용"
              name="content"
              value={formData.content}
              onChange={handleChange}
              error={errors.content}
              placeholder="문의 내용을 자세히 입력해주세요 (최소 10자)"
              rows={8}
              required
            />

            {/* 비공개 설정 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                name="is_private"
                checked={formData.is_private}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border accent-primary focus:ring-primary-ink"
              />
              <label htmlFor="is_private" className="text-sm text-body">
                비공개 문의 (본인만 볼 수 있습니다)
              </label>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px] gap-2"
              >
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
