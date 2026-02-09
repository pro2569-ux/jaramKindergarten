'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    setErrorMessage('')
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.'
    }

    if (!formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.'
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
    setErrorMessage('')

    try {
      const formDataObj = new FormData()
      formDataObj.append('email', formData.email)
      formDataObj.append('password', formData.password)

      // Server Action을 직접 호출하는 대신 fetch 사용
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      router.push(redirectTo)
      router.refresh()
    } catch (error: any) {
      setErrorMessage(error.message || '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-full bg-primary items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">자</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">관리자 로그인</h2>
          <p className="mt-2 text-sm text-gray-600">
            자람동산어린이집 관리자 페이지
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              <Input
                label="이메일"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="admin@example.com"
                required
              />

              <Input
                label="비밀번호"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  '로그인 중...'
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    로그인
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-600">
          관리자 계정이 필요합니다. 문의: info@jaramk.com
        </p>
      </div>
    </div>
  )
}
