import { MapPin, Phone, Clock } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import { getSectionNav } from '@/lib/site-nav'
import LocationMap from './LocationMap'

export const metadata = {
  title: '오시는길',
}

export default async function LocationPage() {
  const nav = await getSectionNav('about')

  return (
    <PageShell
      eyebrow={nav.label}
      title="오시는길"
      subtitle="자람동산어린이집을 찾아오시는 방법을 안내합니다"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 지도 */}
        <div className="lg:col-span-2">
          <LocationMap />
        </div>

        {/* 정보 */}
        <div className="space-y-6">
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-tint">
                <MapPin className="h-6 w-6 text-primary-ink" aria-hidden="true" />
              </div>
              <div>
                <h2 className="typo-h3 mb-1 text-heading">주소</h2>
                <p className="text-body">서울특별시 강남구 테헤란로 123</p>
              </div>
            </div>

            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                <Phone className="h-6 w-6 text-secondary-dark" aria-hidden="true" />
              </div>
              <div>
                <h2 className="typo-h3 mb-1 text-heading">연락처</h2>
                <p className="text-body">
                  전화: 02-1234-5678
                  <br />
                  팩스: 02-1234-5679
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                <Clock className="h-6 w-6 text-accent-dark" aria-hidden="true" />
              </div>
              <div>
                <h2 className="typo-h3 mb-1 text-heading">운영시간</h2>
                <p className="text-body">
                  평일: 07:30 - 19:30
                  <br />
                  토/일/공휴일: 휴무
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-5">
            <h2 className="typo-h3 mb-4 text-heading">대중교통</h2>
            <div className="space-y-3 text-sm text-body">
              <div>
                <span className="font-medium text-heading">지하철:</span>
                <p className="mt-1">2호선 강남역 3번 출구에서 도보 5분</p>
              </div>
              <div>
                <span className="font-medium text-heading">버스:</span>
                <p className="mt-1">
                  간선버스: 146, 401, 472
                  <br />
                  지선버스: 3414, 4319
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
