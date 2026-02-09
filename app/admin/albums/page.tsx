import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = {
  title: '앨범 관리',
}

export default async function AdminAlbumsPage() {
  const supabase = await createClient()

  // 앨범 목록 가져오기
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">앨범 관리</h1>
          <p className="mt-2 text-gray-600">앨범과 사진을 관리합니다</p>
        </div>
        <Link href="/admin/albums/create">
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            새 앨범
          </Button>
        </Link>
      </div>

      {/* 앨범 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums && albums.length > 0 ? (
          albums.map((album) => (
            <Card key={album.id} className="overflow-hidden">
              {/* 커버 이미지 */}
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

              <CardContent className="p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        album.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {album.is_published ? '공개' : '비공개'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                    {album.title}
                  </h3>
                  {album.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {album.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {album.event_date
                      ? formatDate(album.event_date)
                      : formatDate(album.created_at)}
                  </p>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2">
                  <Link href={`/admin/albums/${album.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Edit className="w-4 h-4" />
                      수정
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-3">
            <CardContent className="p-12 text-center text-gray-500">
              등록된 앨범이 없습니다
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
