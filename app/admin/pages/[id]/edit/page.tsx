'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PAGE_TYPES, PageType } from '@/lib/page-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import LayoutOptionsEditor from '@/components/admin/editors/LayoutOptionsEditor'
import StyleConfigEditor from '@/components/admin/editors/StyleConfigEditor'
import CardGridEditor from '@/components/admin/editors/CardGridEditor'
import FaqEditor from '@/components/admin/editors/FaqEditor'
import TimelineEditor from '@/components/admin/editors/TimelineEditor'
import { ArrowLeft, Save, FileText, Palette, Layout, Eye } from 'lucide-react'
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
  page_type: string
  layout_config: Record<string, any>
  style_config: Record<string, any>
  hero_image_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
  sort_order: number
  is_published: boolean
}

type TabType = 'content' | 'layout' | 'style'

export default function EditPagePage({ params }: PageProps) {
  const router = useRouter()
  const [pageId, setPageId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('content')

  // 편집 상태
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pageType, setPageType] = useState<PageType>('single')
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({})
  const [styleConfig, setStyleConfig] = useState<Record<string, any>>({})
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // JSON 콘텐츠 (card_grid, faq, timeline용)
  const [jsonContent, setJsonContent] = useState<any[]>([])

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
        setTitle(data.title || '')
        setContent(data.content || '')
        setPageType((data.page_type as PageType) || 'single')
        setLayoutConfig(data.layout_config || {})
        setStyleConfig(data.style_config || {})
        setHeroImageUrl(data.hero_image_url || '')
        setHeroTitle(data.hero_title || '')
        setHeroSubtitle(data.hero_subtitle || '')
        setIsPublished(data.is_published)

        // JSON 콘텐츠 파싱 (card_grid, faq, timeline)
        if (['card_grid', 'faq', 'timeline'].includes(data.page_type || '')) {
          try {
            setJsonContent(JSON.parse(data.content || '[]'))
          } catch {
            setJsonContent([])
          }
        }
      }
    } catch (error) {
      alert('페이지를 불러오는데 실패했습니다.')
      console.error(error)
      router.push('/admin/pages')
    } finally {
      setLoading(false)
    }
  }

  const handlePageTypeChange = (newType: PageType) => {
    if (newType !== pageType) {
      if (confirm(`페이지 타입을 "${PAGE_TYPES[newType].label}"(으)로 변경하시겠습니까?\n레이아웃 설정이 초기화됩니다.`)) {
        setPageType(newType)
        setLayoutConfig({})
        if (['card_grid', 'faq', 'timeline'].includes(newType)) {
          setJsonContent([])
          setContent('[]')
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // JSON 타입의 콘텐츠는 stringify
      const finalContent = ['card_grid', 'faq', 'timeline'].includes(pageType)
        ? JSON.stringify(jsonContent)
        : content

      const { error } = await supabase
        .from('pages')
        .update({
          title,
          content: finalContent,
          page_type: pageType,
          layout_config: layoutConfig,
          style_config: styleConfig,
          hero_image_url: heroImageUrl || null,
          hero_title: heroTitle || null,
          hero_subtitle: heroSubtitle || null,
          is_published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId)

      if (error) throw error

      alert('페이지가 저장되었습니다.')
    } catch (error: any) {
      alert('저장 실패: ' + (error.message || ''))
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

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'content', label: '콘텐츠', icon: <FileText className="w-4 h-4" /> },
    { key: 'layout', label: '레이아웃', icon: <Layout className="w-4 h-4" /> },
    { key: 'style', label: '스타일', icon: <Palette className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">페이지 편집</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pageData.category} / {pageData.slug}
          </p>
        </div>
        <Link href="/admin/pages">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="페이지 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">페이지 타입</label>
                <select
                  value={pageType}
                  onChange={(e) => handlePageTypeChange(e.target.value as PageType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {Object.entries(PAGE_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} — {val.description}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hero 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="히어로 이미지 URL"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <Input
                label="히어로 제목"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="페이지 상단 큰 제목"
              />
              <Input
                label="히어로 부제목"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="부제목"
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
          </CardContent>
        </Card>

        {/* 탭 */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <Card>
          <CardContent className="pt-6">
            {/* 콘텐츠 탭 */}
            {activeTab === 'content' && (
              <div>
                {pageType === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">콘텐츠</label>
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="페이지 콘텐츠를 입력하세요"
                    />
                  </div>
                )}

                {pageType === 'list' && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">리스트 게시판 타입</p>
                    <p className="text-sm mt-1">이 페이지는 게시글(posts) 테이블과 자동으로 연동됩니다.</p>
                    <p className="text-sm">레이아웃 탭에서 게시판 옵션을 설정하세요.</p>
                  </div>
                )}

                {pageType === 'gallery' && (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">갤러리 타입</p>
                    <p className="text-sm mt-1">이 페이지는 앨범(albums) 테이블과 자동으로 연동됩니다.</p>
                    <p className="text-sm">레이아웃 탭에서 갤러리 옵션을 설정하세요.</p>
                  </div>
                )}

                {pageType === 'pdf_list' && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">PDF 목록 타입</p>
                    <p className="text-sm mt-1">이 페이지는 식단표(meal_plans) 테이블과 자동으로 연동됩니다.</p>
                    <p className="text-sm">레이아웃 탭에서 PDF 옵션을 설정하세요.</p>
                  </div>
                )}

                {pageType === 'card_grid' && (
                  <CardGridEditor value={jsonContent} onChange={setJsonContent} />
                )}

                {pageType === 'faq' && (
                  <FaqEditor value={jsonContent} onChange={setJsonContent} />
                )}

                {pageType === 'timeline' && (
                  <TimelineEditor value={jsonContent} onChange={setJsonContent} />
                )}
              </div>
            )}

            {/* 레이아웃 탭 */}
            {activeTab === 'layout' && (
              <LayoutOptionsEditor
                pageType={pageType}
                layoutConfig={layoutConfig}
                onChange={setLayoutConfig}
              />
            )}

            {/* 스타일 탭 */}
            {activeTab === 'style' && (
              <StyleConfigEditor
                styleConfig={styleConfig}
                onChange={setStyleConfig}
              />
            )}
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
