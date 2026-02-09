import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  Calendar,
  FileText,
  Image as ImageIcon,
  UtensilsCrossed,
  ArrowRight,
  Bell,
  Users
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function Home() {
  const supabase = await createClient()

  // 배너 가져오기
  const { data: banners } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(3)

  // 공지사항 가져오기
  const { data: notices } = await supabase
    .from('posts')
    .select('*')
    .eq('board_type', 'notice')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  // 최근 앨범 가져오기
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <div className="flex flex-col">
      {/* 히어로 배너 섹션 */}
      <section className="relative h-[500px] bg-gradient-to-r from-primary to-primary-light">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-5xl font-bold mb-4">
              아이들이 건강하게 자라는 곳
            </h1>
            <p className="text-xl mb-8 text-white/90">
              자람동산어린이집에서 우리 아이의 밝은 미래를 시작하세요
            </p>
            <div className="flex gap-4">
              <Link href="/about/greeting">
                <Button size="lg" variant="secondary">
                  어린이집 소개
                </Button>
              </Link>
              <Link href="/community/inquiry">
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white hover:bg-white/20">
                  문의하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 바로가기 섹션 */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/board/notice"
              className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-900">공지사항</span>
            </Link>

            <Link
              href="/board/meal-plan"
              className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-900">식단표</span>
            </Link>

            <Link
              href="/board/album"
              className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-900">앨범</span>
            </Link>

            <Link
              href="/about/teachers"
              className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-white" />
              </div>
              <span className="font-semibold text-gray-900">교직원</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 공지사항 섹션 */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">공지사항</h2>
            <Link href="/board/notice">
              <Button variant="ghost" className="gap-2">
                더보기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {notices && notices.length > 0 ? (
                  notices.map((notice) => (
                    <Link
                      key={notice.id}
                      href={`/board/notice/${notice.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {notice.is_pinned && (
                          <span className="px-2 py-1 text-xs font-semibold bg-primary text-white rounded">
                            공지
                          </span>
                        )}
                        <span className="text-gray-900 font-medium truncate">
                          {notice.title}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 ml-4">
                        {formatDate(notice.created_at)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    등록된 공지사항이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 앨범 섹션 */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">최근 앨범</h2>
            <Link href="/board/album">
              <Button variant="ghost" className="gap-2">
                더보기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {albums && albums.length > 0 ? (
              albums.map((album) => (
                <Link key={album.id} href={`/board/album/${album.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-1">
                        {album.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {album.event_date ? formatDate(album.event_date) : formatDate(album.created_at)}
                      </p>
                    </CardHeader>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-4 p-12 text-center text-gray-500">
                등록된 앨범이 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
