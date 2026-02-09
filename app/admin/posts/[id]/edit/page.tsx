'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
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
      // TODO: Supabase에서 게시글 불러오기
      // const supabase = createClient()
      // const { data, error } = await supabase
      //   .from('posts')
      //   .select('*')
      //   .eq('id', id)
      //   .single()
      // if (error) throw error
      // setFormData(data)

      // 임시 데이터
      setFormData({
        board_type: 'notice',
        title: '샘플 게시글',
        content: '샘플 내용입니다.',
        is_published: true,
        is_pinned: false,
      })
    } catch (error) {
      alert('게시글을 불러오는데 실패했습니다.')
      console.error(error)
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
      // TODO: Supabase에 업데이트
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('posts')
      //   .update(formData)
      //   .eq('id', postId)
      // if (error) throw error

      await new Promise((resolve) => setTimeout(resolve, 1000))

      alert('게시글이 수정되었습니다.')
      router.push(`/admin/posts?type=${formData.board_type}`)
    } catch (error: any) {
      alert('게시글 수정 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      // TODO: Supabase에서 삭제
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('posts')
      //   .delete()
      //   .eq('id', postId)
      // if (error) throw error

      alert('게시글이 삭제되었습니다.')
      router.push(`/admin/posts?type=${formData.board_type}`)
    } catch (error) {
      alert('게시글 삭제 중 오류가 발생했습니다.')
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

            {/* 내용 */}
            <Textarea
              label="내용"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="게시글 내용을 입력하세요"
              rows={15}
              required
            />

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
