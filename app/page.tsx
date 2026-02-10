import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ImageSlider from '@/components/ui/ImageSlider'
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
      <section className="relative bg-gradient-to-b from-green-50 to-white py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* 왼쪽: 텍스트 콘텐츠 */}
            <div className="order-1 md:order-1">
              <div className="inline-block mb-4 px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold text-sm">
                🌱 건강한 성장, 행복한 배움
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight text-gray-900">
                아이들이 건강하게<br />
                <span className="text-primary">자라는 곳</span>
              </h1>
              <p className="text-lg md:text-xl mb-6 md:mb-8 text-gray-600 leading-relaxed">
                자람동산어린이집에서<br />
                우리 아이의 밝은 미래를 시작하세요
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/about/greeting">
                  <Button size="lg" className="shadow-lg">
                    어린이집 소개
                  </Button>
                </Link>
                <Link href="/community/inquiry">
                  <Button size="lg" variant="outline">
                    문의하기
                  </Button>
                </Link>
              </div>
            </div>

            {/* 오른쪽: 이미지 슬라이더 */}
            <div className="order-2 md:order-2">
              <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
                <ImageSlider
                  images={[
                    '/images/main1.jpg',
                    '/images/main2.jpg',
                    '/images/main3.jpg',
                    '/images/main4.jpg',
                    '/images/main5.jpg',
                  ]}
                  interval={3000}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 웨이브 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 52.5C120 45 240 30 360 22.5C480 15 600 15 720 18.75C840 22.5 960 30 1080 33.75C1200 37.5 1320 37.5 1380 37.5L1440 37.5V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="white"/>
          </svg>
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

      {/* 어린이집 소개 섹션 */}
      <section className="py-20 bg-gradient-to-b from-white to-green-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* 이미지 */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                {/* TODO: public/images/about/kindergarten.jpg 파일을 추가하면 아래 주석을 해제하세요 */}
                {/* <Image
                  src="/images/about/kindergarten.jpg"
                  alt="자람동산어린이집"
                  fill
                  className="object-cover"
                /> */}
                {/* Placeholder */}
                <div className="w-full h-full bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 flex items-center justify-center">
                  <div className="text-center text-green-700">
                    <ImageIcon className="w-24 h-24 mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-medium">어린이집 사진</p>
                  </div>
                </div>
              </div>
              {/* 장식 요소 */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl" />
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-green-300 rounded-full opacity-20 blur-2xl" />
            </div>

            {/* 텍스트 */}
            <div>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold text-sm mb-4">
                ABOUT US
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                자람동산어린이집을<br />
                소개합니다
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                아이들의 건강한 성장과 행복한 배움을 위해<br />
                최선을 다하는 자람동산어린이집입니다.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">자연주의 교육</h3>
                    <p className="text-gray-600">자연 속에서 건강하게 성장하는 교육 프로그램</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">전문 교사진</h3>
                    <p className="text-gray-600">아이들을 사랑으로 돌보는 경험 많은 선생님들</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">안전한 환경</h3>
                    <p className="text-gray-600">쾌적하고 안전한 교육 시설과 환경</p>
                  </div>
                </div>
              </div>
              <Link href="/about/greeting">
                <Button size="lg" className="gap-2">
                  자세히 보기 <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              자람동산만의 특별함
            </h2>
            <p className="text-lg text-gray-600">
              우리 아이들을 위한 최고의 교육 환경을 제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 특징 1 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🌳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">숲 유치원</h3>
              <p className="text-gray-600 leading-relaxed">
                자연 속에서 오감을 깨우는 숲 체험 프로그램으로 건강한 신체와 정서 발달을 돕습니다.
              </p>
            </div>

            {/* 특징 2 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📚</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">누리과정</h3>
              <p className="text-gray-600 leading-relaxed">
                국가 수준의 교육과정인 누리과정을 바탕으로 체계적인 교육을 제공합니다.
              </p>
            </div>

            {/* 특징 3 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🍎</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">영양 급식</h3>
              <p className="text-gray-600 leading-relaxed">
                신선한 재료로 만든 영양 만점 급식과 간식으로 건강한 성장을 지원합니다.
              </p>
            </div>
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
