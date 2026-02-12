'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

interface PageData {
  id: string
  slug: string
  title: string
  content: string | null
  category: string
  sort_order: number
  is_published: boolean
}

export default function EditPagePage({ params }: PageProps) {
  const router = useRouter()
  const [pageId, setPageId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setPageId(id)
      loadPage(id)
    })
  }, [])

  const loadPage = async (id: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setPageData(data)
        setContent(data.content || '')
        setIsPublished(data.is_published)
      }
    } catch (error) {
      alert('페이지를 불러오는데 실패했습니다.')
      console.error(error)
      router.push('/admin/pages')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('pages')
        .update({
          content,
          is_published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId)

      if (error) throw error

      alert('페이지가 저장되었습니다.')
      router.push('/admin/pages')
    } catch (error: any) {
      alert('페이지 저장 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  if (!pageData) return null

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">페이지 편집</h1>
          <p className="mt-2 text-gray-600">
            {pageData.title} ({pageData.category === 'about' ? '소개' : '보육과정'} / {pageData.slug})
          </p>
        </div>
        <Link href="/admin/pages">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로
          </Button>
        </Link>
      </div>

      {/* 편집 폼 */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{pageData.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 페이지 정보 (읽기 전용) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="슬러그"
                value={pageData.slug}
                disabled
              />
              <Input
                label="카테고리"
                value={pageData.category === 'about' ? '소개' : '보육과정'}
                disabled
              />
            </div>

            {/* 콘텐츠 에디터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                콘텐츠
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="페이지 콘텐츠를 입력하세요"
              />
            </div>

            {/* 공개 토글 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_published" className="text-sm text-gray-700">
                공개 (체크 해제시 비공개)
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end pt-4">
              <Link href="/admin/pages">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <Save className="w-5 h-5" />
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
