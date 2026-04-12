'use client'

import { useEffect, useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RendererProps } from './types'

interface PdfItem {
  id: string
  title: string
  file_url: string | null
  year: number
  month: number
  created_at: string
}

export default function PdfListRenderer({ page, layoutConfig }: RendererProps) {
  const [items, setItems] = useState<PdfItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPdfItems = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('meal_plans')
        .select('id, title, file_url, year, month, created_at')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      setItems(data || [])
      setLoading(false)
    }

    fetchPdfItems()
  }, [])

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      {items.length === 0 ? (
        <div className="text-center text-gray-400 py-12">등록된 파일이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div>
                <h3 className="font-medium text-gray-800">
                  {item.title || `${item.year}년 ${item.month}월 식단표`}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {item.year}년 {item.month}월
                </p>
              </div>
              {item.file_url && (
                <div className="flex gap-2">
                  {layoutConfig.showPreview && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded hover:bg-green-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      보기
                    </a>
                  )}
                  <a
                    href={item.file_url}
                    download
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-primary rounded hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    다운로드
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
