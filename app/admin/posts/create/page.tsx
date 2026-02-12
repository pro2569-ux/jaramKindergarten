'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

function CreatePostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardType = searchParams.get('type') || 'notice'

  const [formData, setFormData] = useState({
    board_type: boardType,
    title: '',
    content: '',
    is_published: true,
    is_pinned: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('로그인이 필요합니다.')
        router.push('/login')
        return
      }

      const { error } = await supabase.from('posts').insert([{
        board_type: formData.board_type,
        title: formData.title,
        content: formData.content,
        is_published: formData.is_published,
        is_pinned: formData.is_pinned,
        author_id: user.id,
      }])

      if (error) throw error

      alert('게시글이 등록되었습니다.')
      router.push(`/admin/posts?type=${boardType}`)
    } catch (error: any) {
      alert('게시글 등록 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">게시글 작성</h1>
          <p className="mt-2 text-gray-600">
            {boardType === 'notice' ? '공지사항' : '가정통신문'}을 작성합니다
          </p>
        </div>
        <Link href={`/admin/posts?type=${boardType}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로
          </Button>
        </Link>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>게시글 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 제목 */}
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="게시글 제목을 입력하세요"
              required
            />

            {/* 내용 (리치 텍스트 에디터) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, content: value }))
                }
                placeholder="게시글 내용을 입력하세요"
              />
            </div>

            {/* 옵션 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_published" className="text-sm text-gray-700">
                  공개 (체크 해제시 비공개)
                </label>
              </div>

              {boardType === 'notice' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    name="is_pinned"
                    checked={formData.is_pinned}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="is_pinned" className="text-sm text-gray-700">
                    상단 고정
                  </label>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end pt-4">
              <Link href={`/admin/posts?type=${boardType}`}>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <Save className="w-5 h-5" />
                {isSubmitting ? '등록 중...' : '게시글 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    }>
      <CreatePostForm />
    </Suspense>
  )
}
