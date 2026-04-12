'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RendererProps } from './types'

interface Album {
  id: string
  title: string
  cover_image_url: string | null
  event_date: string | null
  created_at: string
}

const gapMap = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }
const colsMap = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
const aspectMap = {
  square: 'aspect-square',
  video: 'aspect-video',
  auto: 'aspect-[4/3]',
}

export default function GalleryRenderer({ page, layoutConfig }: RendererProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const cols = colsMap[layoutConfig.columns as keyof typeof colsMap] || 'grid-cols-3'
  const gap = gapMap[layoutConfig.gap as keyof typeof gapMap] || 'gap-4'
  const aspect = aspectMap[layoutConfig.aspectRatio as keyof typeof aspectMap] || 'aspect-[4/3]'

  useEffect(() => {
    const fetchAlbums = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('albums')
        .select('id, title, cover_image_url, event_date, created_at')
        .eq('is_published', true)
        .order('event_date', { ascending: false })

      setAlbums(data || [])
      setLoading(false)
    }

    fetchAlbums()
  }, [])

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      {albums.length === 0 ? (
        <div className="text-center text-gray-400 py-12">앨범이 없습니다.</div>
      ) : (
        <div className={`grid ${cols} ${gap}`}>
          {albums.map((album) => (
            <Link key={album.id} href={`/board/album/${album.id}`} className="group">
              <div className={`relative ${aspect} rounded-lg overflow-hidden bg-gray-100`}>
                {album.cover_image_url ? (
                  <Image
                    src={album.cover_image_url}
                    alt={album.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    사진 없음
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-700 group-hover:text-primary truncate">
                {album.title}
              </h3>
              {album.event_date && (
                <p className="text-xs text-gray-400">
                  {new Date(album.event_date).toLocaleDateString('ko-KR')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
