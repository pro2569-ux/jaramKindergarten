'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ImageUpload from '@/components/ui/ImageUpload'
import LayoutConfigForm from '@/components/admin/layout-forms/LayoutConfigForm'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { PAGE_TYPE_LABELS, type PageType } from '@/lib/page-types'

interface PageData {
  id: string
  slug: string
  title: string
  content: string | null
  category: string
  sort_order: number
  is_published: boolean
  page_type: string | null
  layout_config: Record<string, unknown> | null
  hero_image_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
}

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [pageId, setPageId] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 편집 가능 상태
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [pageType, setPageType] = useState<string>('single')
  const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({})
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')

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
        setPageData(data as PageData)
        setContent(data.content || '')
        setIsPublished(data.is_published)
        setPageType(data.page_type || 'single')
        setLayoutConfig((data.layout_config as Record<string, unknown>) || {})
        setHeroTitle(data.hero_title || '')
        setHeroSubtitle(data.hero_subtitle || '')
        setHeroImageUrl(data.hero_image_url || '')
      }
    } catch (error) {
      alert('페이지를 불러오는데 실패했습니다.')
      console.error(error)
      router.push('/admin/pages')
    } finally {
      setLoading(false)
    }
  }

  // page_type 변경
  const handlePageTypeChange = (newType: string) => {
    if (newType === pageType) return

    // single → 다른 타입: 본문이 있으면 숨겨진다는 경고
    const hasContent = pageType === 'single' && content.trim() !== ''
    if (
      hasContent &&
      !confirm(
        '작성된 본문 내용이 있습니다. 다른 타입으로 바꾸면 본문이 화면에서 숨겨집니다.' +
          '\n(데이터는 보존되며, 단일 페이지로 되돌리면 다시 표시됩니다.)' +
          '\n\n계속하시겠습니까?'
      )
    ) return

    // layout_config에 기존 데이터가 있을 때 리셋 경고
    const hasConfig = Object.keys(layoutConfig).length > 0
    if (
      hasConfig &&
      !confirm(
        `페이지 타입을 "${PAGE_TYPE_LABELS[newType as PageType]}"으로 변경하면\n현재 레이아웃 설정이 초기화됩니다.\n계속하시겠습니까?`
      )
    ) return

    setPageType(newType)
    setLayoutConfig({})
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
          page_type: pageType,
          layout_config: layoutConfig,
          hero_title: heroTitle || null,
          hero_subtitle: heroSubtitle || null,
          hero_image_url: heroImageUrl || null,
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

  const categoryLabel = pageData.category === 'about' ? '소개' : '보육과정'

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">페이지 편집</h1>
          <p className="mt-2 text-gray-600">
            {pageData.title} ({categoryLabel} / {pageData.slug})
          </p>
        </div>
        <Link href="/admin/pages">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />목록으로
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 카드 1: 기본 정보 */}
        <Card>
          <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="슬러그" value={pageData.slug} disabled />
              <Input label="카테고리" value={categoryLabel} disabled />
            </div>

            {/* 페이지 타입 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">페이지 타입</label>
              <select
                value={pageType}
                onChange={(e) => handlePageTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {(Object.entries(PAGE_TYPE_LABELS) as [PageType, string][]).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {{
                  single:    '리치 텍스트 에디터로 콘텐츠를 작성합니다.',
                  list:      '게시판(posts 테이블)에서 글 목록을 자동으로 불러옵니다.',
                  gallery:   '앨범(albums 테이블)에서 사진을 자동으로 불러옵니다.',
                  pdf_list:  '레이아웃 설정 카드에서 PDF 파일 목록을 직접 관리합니다.',
                  card_grid: '레이아웃 설정 카드에서 카드 항목을 직접 관리합니다.',
                  faq:       '레이아웃 설정 카드에서 Q&A 항목을 직접 관리합니다.',
                  timeline:  '레이아웃 설정 카드에서 타임라인 항목을 직접 관리합니다.',
                }[pageType]}
              </p>
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
                공개 (체크 해제 시 비공개)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 카드 2: Hero 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>Hero 설정 <span className="text-sm font-normal text-gray-500">(선택)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Hero 제목"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="페이지 상단에 표시할 제목"
              />
              <Input
                label="Hero 부제목"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="제목 아래 부제목"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero 이미지</label>
              <ImageUpload
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                onRemove={() => setHeroImageUrl('')}
                folder="pages"
              />
            </div>
          </CardContent>
        </Card>

        {/* 카드 3: 콘텐츠 (single 타입만 표시) */}
        {pageType === 'single' && (
          <Card>
            <CardHeader><CardTitle>콘텐츠</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="페이지 콘텐츠를 입력하세요"
              />
            </CardContent>
          </Card>
        )}

        {/* 카드 4: 레이아웃 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>
              레이아웃 설정
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {PAGE_TYPE_LABELS[pageType as PageType] ?? '단일 페이지'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LayoutConfigForm
              pageType={pageType}
              value={layoutConfig}
              onChange={setLayoutConfig}
            />
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex gap-3 justify-end">
          <Link href="/admin/pages">
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="w-5 h-5" />
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
