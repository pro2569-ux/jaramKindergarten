'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { MessageCircle, Send } from 'lucide-react'

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
    } catch (error) {
      alert('문의 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="py-16 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                문의가 접수되었습니다
              </h2>
              <p className="text-gray-600 mb-6">
                빠른 시일 내에 답변 드리겠습니다.
                <br />
                등록하신 이메일로 답변이 전송됩니다.
              </p>
              <Button onClick={() => setIsSubmitted(false)}>
                추가 문의하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">문의하기</h1>
          <p className="text-gray-600">
            궁금하신 사항을 남겨주시면 성심껏 답변해드리겠습니다
          </p>
        </div>

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
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_private" className="text-sm text-gray-700">
                  비공개 문의 (본인만 볼 수 있습니다)
                </label>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="gap-2 min-w-[200px]"
                >
                  {isSubmitting ? (
                    '등록 중...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      문의 등록
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
