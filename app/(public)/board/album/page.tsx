import { getAlbumsPage } from '@/lib/public-data'
import Link from 'next/link'
import Image from 'next/image'
import { PAGINATION } from '@/lib/constants'
import Pagination from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { Image as ImageIcon, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import ContentCard from '@/components/ui/ContentCard'
import EmptyState from '@/components/ui/EmptyState'
import { getSectionNav } from '@/lib/site-nav'

export const metadata = {
  title: '앨범',
}

interface SearchParams {
  page?: string
}

export default async function AlbumPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const pageSize = PAGINATION.ALBUM_PAGE_SIZE

  // 사이드바 메뉴와 앨범 목록(개수 포함, 커버는 서명 URL 로 해석)을 병렬로 — 태그 캐시
  const [nav, { albums, count }] = await Promise.all([getSectionNav('board'), getAlbumsPage(currentPage, pageSize)])
  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <PageShell
      eyebrow={nav.label}
      title="앨범"
      subtitle="자람동산 아이들의 소중한 순간들을 함께 나눠요"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      card={false}
    >
      {albums && albums.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <Link key={album.id} href={`/board/album/${album.id}`} className="group rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2">
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                {/* 앨범 커버 이미지 */}
                <div className="relative aspect-video bg-gray-100">
                  {album.cover_image_url ? (
                    <Image
                      src={album.cover_image_url}
                      alt={album.title}
                      fill
                      sizes="(min-width: 1280px) 280px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-disabled" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* 앨범 정보 */}
                <CardHeader>
                  <CardTitle className="line-clamp-2 group-hover:text-primary-ink">{album.title}</CardTitle>
                  {album.description && (
                    <p className="line-clamp-2 text-sm text-muted">{album.description}</p>
                  )}
                  <div className="flex items-center gap-1 pt-1 text-sm text-muted">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
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
      ) : (
        <ContentCard className="p-0 md:p-0">
          <EmptyState
            icon={ImageIcon}
            title="등록된 앨범이 없습니다."
            description="아이들의 소중한 순간을 곧 만나보실 수 있어요."
          />
        </ContentCard>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/board/album"
          />
        </div>
      )}
    </PageShell>
  )
}
