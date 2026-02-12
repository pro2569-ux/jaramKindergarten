'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ImageUpload from '@/components/ui/ImageUpload'
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Save,
  X,
} from 'lucide-react'

interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function AdminBannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setBanners(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.image_url) {
      alert('배너 이미지를 업로드해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const maxOrder = banners.length > 0
        ? Math.max(...banners.map((b) => b.sort_order))
        : 0

      const { error } = await supabase.from('banners').insert([{
        title: formData.title || null,
        image_url: formData.image_url,
        link_url: formData.link_url || null,
        sort_order: maxOrder + 1,
        is_active: true,
      }])

      if (error) throw error

      alert('배너가 추가되었습니다.')
      setFormData({ title: '', image_url: '', link_url: '' })
      setShowForm(false)
      loadBanners()
    } catch (error: any) {
      alert('배너 추가 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !currentActive })
        .eq('id', id)

      if (error) throw error
      loadBanners()
    } catch (error: any) {
      alert('상태 변경 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = banners.findIndex((b) => b.id === id)
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === banners.length - 1)
    )
      return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const currentOrder = banners[idx].sort_order
    const swapOrder = banners[swapIdx].sort_order

    try {
      const supabase = createClient()
      await Promise.all([
        supabase
          .from('banners')
          .update({ sort_order: swapOrder })
          .eq('id', banners[idx].id),
        supabase
          .from('banners')
          .update({ sort_order: currentOrder })
          .eq('id', banners[swapIdx].id),
      ])
      loadBanners()
    } catch (error: any) {
      alert('순서 변경 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('banners').delete().eq('id', id)

      if (error) throw error

      alert('배너가 삭제되었습니다.')
      loadBanners()
    } catch (error: any) {
      alert('배너 삭제 중 오류가 발생했습니다: ' + (error.message || ''))
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
          <h1 className="text-3xl font-bold text-gray-900">배너 관리</h1>
          <p className="mt-2 text-gray-600">메인 페이지 배너를 관리합니다</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-5 h-5" />
              취소
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              배너 추가
            </>
          )}
        </Button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>새 배너 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              value={formData.image_url}
              onChange={(url) =>
                setFormData((prev) => ({ ...prev, image_url: url }))
              }
              onRemove={() =>
                setFormData((prev) => ({ ...prev, image_url: '' }))
              }
              folder="banners"
            />
            <Input
              label="배너 제목 (선택)"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="배너 제목을 입력하세요"
            />
            <Input
              label="링크 URL (선택)"
              value={formData.link_url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, link_url: e.target.value }))
              }
              placeholder="https://example.com"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="w-5 h-5" />
                {isSubmitting ? '추가 중...' : '배너 추가'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 배너 목록 */}
      <div className="space-y-4">
        {banners.length > 0 ? (
          banners.map((banner, index) => (
            <Card key={banner.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* 순서 변경 */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMove(banner.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMove(banner.id, 'down')}
                      disabled={index === banners.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 썸네일 */}
                  <div className="w-40 h-24 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                    {banner.image_url ? (
                      <Image
                        src={banner.image_url}
                        alt={banner.title || '배너'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {banner.title || '(제목 없음)'}
                    </h3>
                    {banner.link_url && (
                      <p className="text-sm text-gray-500 truncate">
                        {banner.link_url}
                      </p>
                    )}
                  </div>

                  {/* 활성/비활성 토글 */}
                  <button
                    onClick={() =>
                      handleToggleActive(banner.id, banner.is_active)
                    }
                    className={`px-3 py-1 text-sm font-semibold rounded ${
                      banner.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {banner.is_active ? '활성' : '비활성'}
                  </button>

                  {/* 삭제 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(banner.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              등록된 배너가 없습니다
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
