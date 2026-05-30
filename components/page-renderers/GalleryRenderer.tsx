import { createClient } from '@/lib/supabase/server'
import type { Page } from '@/types/database'
import type { GalleryLayoutConfig } from '@/lib/page-types'
import Link from 'next/link'
import Image from 'next/image'
import { Image as ImageIcon, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate, cn } from '@/lib/utils'

const COLUMNS_CLASS: Record<string, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

const GAP_CLASS: Record<string, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

const ASPECT_CLASS: Record<string, string> = {
  square: 'aspect-square',
  video:  'aspect-video',
  auto:   'aspect-video',
}

export default async function GalleryRenderer({ page }: { page: Page }) {
  const config = (page.layout_config ?? {}) as GalleryLayoutConfig
  const columns    = config.columns     ?? 3
  const gap        = config.gap         ?? 'md'
  const aspectRatio = config.aspectRatio ?? 'video'

  const supabase = await createClient()
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12)

  const columnsClass = COLUMNS_CLASS[String(columns)] ?? COLUMNS_CLASS['3']
  const gapClass     = GAP_CLASS[gap]                  ?? GAP_CLASS['md']
  const aspectClass  = ASPECT_CLASS[aspectRatio]        ?? ASPECT_CLASS['video']

  if (!albums || albums.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>등록된 앨범이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid', columnsClass, gapClass)}>
      {albums.map((album) => (
        <Link key={album.id} href={`/board/album/${album.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
            <div className={cn('bg-gray-200 relative', aspectClass)}>
              {album.cover_image_url ? (
                <Image
                  src={album.cover_image_url}
                  alt={album.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className="text-lg line-clamp-2 mb-2">{album.title}</CardTitle>
              {album.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{album.description}</p>
              )}
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {album.event_date
                    ? formatDate(album.event_date)
                    : formatDate(album.created_at)}
                </span>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
