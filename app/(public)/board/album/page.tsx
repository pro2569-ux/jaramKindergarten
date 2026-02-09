import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { PAGINATION } from '@/lib/constants'
import Pagination from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { Image as ImageIcon, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

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

  const supabase = await createClient()

  // 전체 개수 가져오기
  const { count } = await supabase
    .from('albums')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const totalPages = Math.ceil((count || 0) / pageSize)

  // 앨범 목록 가져오기
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">앨범</h1>
          <p className="text-gray-600">
            자람동산 아이들의 소중한 순간들을 함께 나눠요
          </p>
        </div>

        {/* 앨범 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums && albums.length > 0 ? (
            albums.map((album) => (
              <Link key={album.id} href={`/board/album/${album.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  {/* 앨범 커버 이미지 */}
                  <div className="aspect-video bg-gray-200 relative">
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

                  {/* 앨범 정보 */}
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {album.title}
                    </CardTitle>
                    {album.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {album.description}
                      </p>
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
            ))
          ) : (
            <div className="col-span-full p-16 text-center text-gray-500">
              등록된 앨범이 없습니다.
            </div>
          )}
        </div>

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
      </div>
    </div>
  )
}
