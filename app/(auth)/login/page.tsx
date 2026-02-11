'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { LogIn } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin'

  const [formData, setFormData] = useState({
    username: '',
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

    if (!formData.username.trim()) {
      newErrors.username = '아이디를 입력해주세요.'
    } else if (formData.username.length < 3) {
      newErrors.username = '아이디는 최소 3자 이상이어야 합니다.'
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
      // ID를 이메일 형식으로 변환 (admin -> admin@jaramk.com)
      const email = `${formData.username}@jaramk.com`

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: formData.password,
        }),
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
                label="아이디"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                placeholder="admin"
                autoComplete="username"
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
                autoComplete="current-password"
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

        <div className="mt-4 text-center space-y-2">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-primary hover:text-primary-dark font-medium">
              회원가입
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            관리자 계정 문의: info@jaramk.com
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
