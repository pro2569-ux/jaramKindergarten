import { createClient } from '@/lib/supabase/server'
import { withResolvedMedia } from '@/lib/storage/media'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import { Calendar, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import ButtonLink from '@/components/ui/ButtonLink'
import EmptyState from '@/components/ui/EmptyState'
import { getSectionNav } from '@/lib/site-nav'

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
  const { data: photoRows } = await supabase
    .from('album_photos')
    .select('*')
    .eq('album_id', id)
    .order('sort_order')
    .order('created_at')

  // 이관 사진(legacy-media 버킷)은 서명 URL 로 해석 (공개 앨범만 여기까지 옴)
  const photos = await withResolvedMedia(photoRows ?? [], 'image_url')
  const nav = await getSectionNav('board')

  return (
    <PageShell
      eyebrow={nav.label}
      title="앨범"
      titleAs="p"
      titleHref="/board/album"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      card={false}
    >
      {/* 목록으로 */}
      <div className="mb-4">
        <ButtonLink href="/board/album" variant="ghost" size="sm" className="-ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          목록으로
        </ButtonLink>
      </div>

      <article className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        {/* 앨범 헤더: 페이지 유일의 h1 */}
        <header className="border-b border-border px-4 py-5 md:px-6 md:py-6">
          <h1 className="typo-h1 text-heading">{album.title}</h1>
          {album.description && (
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-body">{album.description}</p>
          )}
          <div className="mt-3 flex items-center gap-1 text-sm text-muted">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>
              {album.event_date
                ? formatDate(album.event_date)
                : formatDate(album.created_at)}
            </span>
          </div>
        </header>

        {/* 사진 그리드 */}
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 md:gap-4 md:p-6 lg:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-control bg-gray-100 transition-shadow hover:shadow-md"
              >
                {photo.image_url ? (
                  <Image
                    src={photo.image_url}
                    alt={photo.caption || album.title}
                    fill
                    sizes="(min-width: 1024px) 210px, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-disabled" aria-hidden="true" />
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-sm text-white">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={ImageIcon} title="등록된 사진이 없습니다." />
        )}
      </article>

      {/* 하단 버튼 */}
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/board/album" variant="outline">
          목록으로
        </ButtonLink>
      </div>
    </PageShell>
  )
}
