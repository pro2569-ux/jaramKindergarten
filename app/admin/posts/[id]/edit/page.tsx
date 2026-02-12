'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditPostPage({ params }: PageProps) {
  const router = useRouter()
  const [postId, setPostId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    board_type: 'notice',
    title: '',
    content: '',
    is_published: true,
    is_pinned: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setPostId(id)
      loadPost(id)
    })
  }, [])

  const loadPost = async (id: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          board_type: data.board_type,
          title: data.title,
          content: data.content || '',
          is_published: data.is_published,
          is_pinned: data.is_pinned,
        })
      }
    } catch (error) {
      alert('게시글을 불러오는데 실패했습니다.')
      console.error(error)
      router.push('/admin/posts')
    } finally {
      setLoading(false)
    }
  }

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
      const { error } = await supabase
        .from('posts')
        .update({
          title: formData.title,
          content: formData.content,
          is_published: formData.is_published,
          is_pinned: formData.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)

      if (error) throw error

      alert('게시글이 수정되었습니다.')
      router.push(`/admin/posts?type=${formData.board_type}`)
    } catch (error: any) {
      alert('게시글 수정 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      alert('게시글이 삭제되었습니다.')
      router.push(`/admin/posts?type=${formData.board_type}`)
    } catch (error: any) {
      alert('게시글 삭제 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">게시글 수정</h1>
          <p className="mt-2 text-gray-600">게시글을 수정합니다</p>
        </div>
        <Link href={`/admin/posts?type=${formData.board_type}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로
          </Button>
        </Link>
      </div>

      {/* 수정 폼 */}
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

              {formData.board_type === 'notice' && (
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
            <div className="flex gap-3 justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
                삭제
              </Button>
              <div className="flex gap-3">
                <Link href={`/admin/posts?type=${formData.board_type}`}>
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Save className="w-5 h-5" />
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
