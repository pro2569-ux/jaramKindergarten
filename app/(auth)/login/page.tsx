'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [successMessage, setSuccessMessage] = useState('')

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
    setSuccessMessage('')

    try {
      // ID를 이메일 형식으로 변환 (admin -> admin@jaramk.com)
      const email = `${formData.username}@jaramk.com`

      // 클라이언트 사이드 Supabase로 로그인 (브라우저 쿠키 자동 저장)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      })

      if (error) {
        throw new Error(error.message)
      }

      // profiles 테이블에서 name, role 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .single()

      const userName = profile?.name || ''
      if (userName) {
        localStorage.setItem('userName', userName)
      }

      setSuccessMessage(`${userName || formData.username}님, 환영합니다!`)

      // 관리자만 관리 화면으로 (redirectTo 는 같은 사이트 경로만 허용). 그 외 계정은 홈으로
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/admin'
      const destination = profile?.role === 'admin' ? safeRedirect : '/'

      setTimeout(() => {
        window.location.href = destination
      }, 1000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-page px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="text-2xl font-bold text-on-primary">자</span>
          </div>
          <h1 className="typo-h1 text-heading">관리자 로그인</h1>
          <p className="mt-2 text-sm text-muted">
            자람동산어린이집 관리자 전용 로그인입니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="rounded-control border border-red-200 bg-red-50 p-3" role="alert">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="rounded-control border border-green-200 bg-green-50 p-3" role="status">
                  <p className="text-sm font-medium text-green-700">{successMessage}</p>
                  <p className="mt-1 text-xs text-green-700">잠시 후 이동합니다...</p>
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
                disabled={isSubmitting || !!successMessage}
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  '로그인 중...'
                ) : successMessage ? (
                  '로그인 성공!'
                ) : (
                  <>
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                    로그인
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center bg-page py-24">
        <div className="text-muted">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
