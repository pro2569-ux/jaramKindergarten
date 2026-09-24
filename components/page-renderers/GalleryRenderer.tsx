'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Image as ImageIcon } from 'lucide-react'
import { RendererProps } from './types'
import EmptyState from '@/components/ui/EmptyState'

interface Album {
  id: string
  title: string
  cover_image_url: string | null
  event_date: string | null
  created_at: string
  category?: string | null
}

const gapMap = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }
const colsMap = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' }
const aspectMap = {
  square: 'aspect-square',
  video: 'aspect-video',
  auto: 'aspect-[4/3]',
}

/**
 * 갤러리(앨범 목록) 렌더러.
 * layout_config.category 가 있으면 그 반(albums.category)의 공개 앨범만 보여준다 (반별 게시판).
 * 공개 앨범이 없으면 빈 화면 대신 안내를 보여준다.
 */
export default function GalleryRenderer({ page, layoutConfig }: RendererProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const category = typeof layoutConfig.category === 'string' ? layoutConfig.category : null

  const cols = colsMap[layoutConfig.columns as keyof typeof colsMap] || 'grid-cols-2 md:grid-cols-3'
  const gap = gapMap[layoutConfig.gap as keyof typeof gapMap] || 'gap-4'
  const aspect = aspectMap[layoutConfig.aspectRatio as keyof typeof aspectMap] || 'aspect-[4/3]'

  useEffect(() => {
    // 이관 앨범의 커버는 private 버킷이라 브라우저에서 직접 조회할 수 없다.
    // 서버 라우트가 공개 앨범만 골라 서명 URL 로 바꿔 내려준다.
    const fetchAlbums = async () => {
      setLoading(true)
      try {
        const qs = category ? `?category=${encodeURIComponent(category)}` : ''
        const res = await fetch(`/api/albums${qs}`)
        const json = (await res.json()) as { albums?: Album[] }
        setAlbums(res.ok && json.albums ? json.albums : [])
      } catch {
        setAlbums([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlbums()
  }, [category])

  if (loading) {
    return <div className="py-8 text-center text-muted">불러오는 중...</div>
  }

  if (albums.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={category ? `아직 공개된 ${category} 앨범이 없어요` : '아직 공개된 앨범이 없어요'}
        description="앨범이 공개되면 이곳에 보여드릴게요."
      />
    )
  }

  return (
    <div>
      {page.hero_subtitle ? null : (
        <p className="mb-4 text-sm text-muted">
          {category ? `${category} 앨범 ${albums.length}개` : `앨범 ${albums.length}개`}
        </p>
      )}
      <div className={`grid ${cols} ${gap}`}>
        {albums.map((album) => (
          <Link key={album.id} href={`/board/album/${album.id}`} className="group">
            <div className={`relative ${aspect} overflow-hidden rounded-control bg-page`}>
              {album.cover_image_url ? (
                <Image
                  src={album.cover_image_url}
                  alt={album.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-disabled">
                  <ImageIcon className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
            </div>
            <h3 className="mt-2 truncate text-sm font-medium text-body group-hover:text-primary-ink">{album.title}</h3>
            {album.event_date && (
              <p className="text-xs text-muted">{new Date(album.event_date).toLocaleDateString('ko-KR')}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
