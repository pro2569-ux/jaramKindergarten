import Link from 'next/link'
import Image from 'next/image'
import { getHomeAlbums, getHomeNotices } from '@/lib/public-data'
import { getSiteSettings } from '@/lib/site-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import ButtonLink from '@/components/ui/ButtonLink'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ImageSlider from '@/components/ui/ImageSlider'
import {
  Image as ImageIcon,
  ArrowRight,
  Bell,
  Users,
  Instagram,
  BookOpen,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

/** 메인 바로가기 4개 — 순서·링크는 여기서 관리 */
const QUICK_LINKS = [
  { name: '공지사항', href: '/board/notice', icon: Bell, card: 'from-tint to-tint-strong', circle: 'bg-primary', iconColor: 'text-on-primary', external: false },
  { name: '인스타그램', href: 'https://www.instagram.com/jaramdongsan13/', icon: Instagram, card: 'from-pink-50 to-pink-100', circle: 'bg-secondary', iconColor: 'text-on-primary', external: true },
  { name: '교육자료', href: '/community/archive', icon: BookOpen, card: 'from-blue-50 to-blue-100', circle: 'bg-accent', iconColor: 'text-white', external: false },
  { name: '교직원', href: '/about/class', icon: Users, card: 'from-purple-50 to-purple-100', circle: 'bg-purple-500', iconColor: 'text-white', external: false },
] as const

// 정적(ISR) 페이지: 쿠키를 읽지 않고 태그 캐시 로더만 쓴다. 관리자 저장 시 /api/revalidate 가 즉시 갱신.
export const revalidate = 300 // lib/public-data PUBLIC_REVALIDATE 와 같은 값 (세그먼트 설정은 리터럴만 허용)

interface NoticeRow {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
}

export default async function Home() {
  // 메인 섹션 표시 여부 (관리자 > 사이트 설정 > 메인 화면 섹션). 값이 없으면 표시
  const settings = await getSiteSettings()
  const showIntro = settings.home_show_intro !== 'false'
  const showAlbums = settings.home_show_albums !== 'false'

  // 공지 5건 + 최근 앨범 4건(섹션이 켜져 있을 때만) 을 병렬로. 이관 앨범 커버는 로더가 서명 URL 로 해석
  const [noticeRows, albums] = await Promise.all([getHomeNotices(), showAlbums ? getHomeAlbums() : Promise.resolve([])])
  const notices = noticeRows as unknown as NoticeRow[]

  return (
    // 패턴 배경은 메인 전체를 감싸는 이 한 곳에만 깐다(PageShell 과 같은 방식). 각 섹션은 배경 투명 →
    // 무늬가 섹션 경계에서 잘리지 않고 위아래로 이어진다. background-attachment: fixed 는 iOS 문제로 쓰지 않음.
    <div className="bg-pattern flex flex-col">
      {/* 히어로 배너 섹션 — 배경 투명: 감싸는 패턴이 다른 영역과 같은 투명도로 그대로 비친다 */}
      <section className="relative overflow-hidden py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* 왼쪽: 텍스트 콘텐츠 */}
            <div className="order-1 md:order-1">
              <div className="inline-block mb-4 px-4 py-2 bg-tint-strong rounded-full text-primary-ink font-semibold text-sm">
                🌱 건강한 성장, 행복한 배움
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight text-gray-900">
                아이들이 건강하게<br />
                <span className="underline decoration-primary decoration-8 underline-offset-4">자라는 곳</span>
              </h1>
              <p className="text-lg md:text-xl mb-6 md:mb-8 text-gray-600 leading-relaxed">
                자람동산어린이집에서<br />
                우리 아이의 밝은 미래를 시작하세요
              </p>
              <div className="flex flex-wrap gap-4">
                <ButtonLink href="/about/greeting" size="lg" className="shadow-md">
                  어린이집 소개
                </ButtonLink>
                <ButtonLink href="/community/inquiry" size="lg" variant="outline">
                  문의하기
                </ButtonLink>
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
      </section>

      {/* 바로가기 섹션 (배경 투명 — 감싸는 패턴이 비친다) */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {QUICK_LINKS.map((q) => {
              const cls = `flex flex-col items-center rounded-card bg-gradient-to-br ${q.card} p-6 shadow-sm transition-all hover:shadow-md`
              const inner = (
                <>
                  <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${q.circle}`}>
                    <q.icon className={`h-8 w-8 ${q.iconColor}`} aria-hidden="true" />
                  </div>
                  <span className="font-semibold text-gray-900">{q.name}</span>
                </>
              )
              return q.external ? (
                <a key={q.name} href={q.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                  <span className="sr-only">(새 창에서 열림)</span>
                </a>
              ) : (
                <Link key={q.name} href={q.href} className={cls}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 어린이집 소개 섹션 (설정 home_show_intro 로 표시/숨김) */}
      {showIntro && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* 이미지 (장식 원이 모바일에서 가로 스크롤을 만들지 않게 overflow-hidden) */}
              <div className="relative overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  {/* TODO: public/images/about/kindergarten.jpg 파일을 추가하면 아래 주석을 해제하세요 */}
                  {/* <Image
                    src="/images/about/kindergarten.jpg"
                    alt="자람동산어린이집"
                    fill
                    className="object-cover"
                  /> */}
                  {/* Placeholder */}
                  <div className="w-full h-full bg-gradient-to-br from-tint-strong via-blue-100 to-purple-100 flex items-center justify-center">
                    <div className="text-center text-primary-ink">
                      <ImageIcon className="w-24 h-24 mx-auto mb-4 opacity-50" />
                      <p className="text-sm font-medium">어린이집 사진</p>
                    </div>
                  </div>
                </div>
                {/* 장식 요소 */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl" />
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-secondary rounded-full opacity-30 blur-2xl" />
              </div>

              {/* 텍스트 */}
              <div>
                <div className="inline-block px-4 py-2 bg-tint-strong rounded-full text-primary-ink font-semibold text-sm mb-4">
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
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-on-primary text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">자연주의 교육</h3>
                      <p className="text-gray-600">자연 속에서 건강하게 성장하는 교육 프로그램</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-on-primary text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">전문 교사진</h3>
                      <p className="text-gray-600">아이들을 사랑으로 돌보는 경험 많은 선생님들</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-on-primary text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">안전한 환경</h3>
                      <p className="text-gray-600">쾌적하고 안전한 교육 시설과 환경</p>
                    </div>
                  </div>
                </div>
                <ButtonLink href="/about/greeting" size="lg" className="gap-2">
                  자세히 보기 <ArrowRight className="w-5 h-5" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 특징 섹션 — 구역을 흰 띠로 칠하지 않고 카드만 파스텔 배경 */}
      <section className="py-16 md:py-20">
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
            <div className="group p-8 rounded-card bg-gradient-to-br from-tint to-tint-strong hover:shadow-md transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-card bg-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🌳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">숲 유치원</h3>
              <p className="text-gray-600 leading-relaxed">
                자연 속에서 오감을 깨우는 숲 체험 프로그램으로 건강한 신체와 정서 발달을 돕습니다.
              </p>
            </div>

            {/* 특징 2 */}
            <div className="group p-8 rounded-card bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📚</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">누리과정</h3>
              <p className="text-gray-600 leading-relaxed">
                국가 수준의 교육과정인 누리과정을 바탕으로 체계적인 교육을 제공합니다.
              </p>
            </div>

            {/* 특징 3 */}
            <div className="group p-8 rounded-card bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-all duration-300 hover:-translate-y-2">
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

      {/* 공지사항 섹션 (배경 투명, 카드는 흰색) */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="typo-h2 text-heading">공지사항</h2>
            <ButtonLink href="/board/notice" variant="ghost" className="gap-2">
              더보기 <ArrowRight className="w-4 h-4" />
            </ButtonLink>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {notices && notices.length > 0 ? (
                  notices.map((notice) => (
                    <Link
                      key={notice.id}
                      href={`/board/notice/${notice.id}`}
                      className="flex items-center justify-between p-4 hover:bg-tint transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {notice.is_pinned && (
                          <Badge>공지</Badge>
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
                  <EmptyState icon={Bell} title="등록된 공지사항이 없습니다." description="새 소식이 올라오면 이곳에 표시됩니다." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 앨범 섹션 (설정 home_show_albums 로 표시/숨김) */}
      {showAlbums && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="typo-h2 text-heading">최근 앨범</h2>
              <ButtonLink href="/board/album" variant="ghost" className="gap-2">
                더보기 <ArrowRight className="w-4 h-4" />
              </ButtonLink>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {albums.length > 0 ? (
                albums.map((album) => (
                  <Link key={album.id} href={`/board/album/${album.id}`}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gray-200 relative">
                        {album.cover_image_url ? (
                          <Image
                            src={album.cover_image_url}
                            alt={album.title}
                            fill
                            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
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
                <div className="col-span-full rounded-card border border-border bg-surface"><EmptyState icon={ImageIcon} title="등록된 앨범이 없습니다." description="아이들의 소중한 순간을 곧 만나보실 수 있어요." /></div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 푸터로 넘어가기 전 페이드 — 무늬가 푸터 경계에서 잘리지 않게 바탕색으로 서서히 가라앉힌다 */}
      <div aria-hidden="true" className="h-20 bg-gradient-to-b from-transparent to-page" />
    </div>
  )
}
