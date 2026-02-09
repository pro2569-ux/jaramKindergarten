import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import { Calendar, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: album } = await supabase
    .from('albums')
    .select('title')
    .eq('id', id)
    .single()

  return {
    title: album?.title || '앨범',
  }
}

export default async function AlbumDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 앨범 정보 가져오기
  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!album) {
    notFound()
  }

  // 앨범 사진들 가져오기
  const { data: photos } = await supabase
    .from('album_photos')
    .select('*')
    .eq('album_id', id)
    .order('sort_order')
    .order('created_at')

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 목록으로 버튼 */}
        <div className="mb-6">
          <Link href="/board/album">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              목록으로
            </Button>
          </Link>
        </div>

        {/* 앨범 헤더 */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {album.title}
          </h1>
          {album.description && (
            <p className="text-lg text-gray-700 mb-4">{album.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {album.event_date
                ? formatDate(album.event_date)
                : formatDate(album.created_at)}
            </span>
          </div>
        </div>

        {/* 사진 그리드 */}
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer hover:shadow-lg transition-shadow"
              >
                <Image
                  src={photo.image_url}
                  alt={photo.caption || album.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm line-clamp-2">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 사진이 없습니다.</p>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="mt-8 flex justify-center">
          <Link href="/board/album">
            <Button>목록으로</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
