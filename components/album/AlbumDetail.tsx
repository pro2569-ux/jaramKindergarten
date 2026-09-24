import { getAlbumPhotos } from '@/lib/public-data'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import { Calendar, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import ButtonLink from '@/components/ui/ButtonLink'
import EmptyState from '@/components/ui/EmptyState'

export interface AlbumRow {
  id: string
  title: string
  description: string | null
  event_date: string | null
  created_at: string
  category?: string | null
}

interface AlbumDetailProps {
  album: AlbumRow
  /** "목록으로" 가 돌아갈 경로 (반별 게시판이면 /board/<반>) */
  listHref: string
}

/**
 * 앨범 상세 본문 (사진 그리드). /board/album/[id] 와 반별 게시판 경로(/board/<반>/<앨범>) 가 같이 쓴다.
 * 공개 앨범만 여기까지 온다 — 호출한 쪽에서 is_published 를 확인한다.
 */
export default async function AlbumDetail({ album, listHref }: AlbumDetailProps) {
  // 태그 캐시 로더(쿠키 없음) — 이관 사진(legacy-media 버킷)은 서명 URL 로 해석돼 온다
  const photos = await getAlbumPhotos(album.id)

  return (
    <>
      <div className="mb-4">
        <ButtonLink href={listHref} variant="ghost" size="sm" className="-ml-3 gap-2">
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
            <span>{album.event_date ? formatDate(album.event_date) : formatDate(album.created_at)}</span>
          </div>
        </header>

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

      <div className="mt-6 flex justify-center">
        <ButtonLink href={listHref} variant="outline">
          목록으로
        </ButtonLink>
      </div>
    </>
  )
}
