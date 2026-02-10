'use client'

import { useEffect, useRef } from 'react'
import { MapPin, Phone, Clock } from 'lucide-react'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export default function LocationPage() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 카카오맵 API 스크립트 로드
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao?.maps.load(() => {
        if (!mapRef.current) return

        const container = mapRef.current
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 기본 좌표 (서울시청)
          level: 3,
        }

        const map = new window.kakao.maps.Map(container, options)

        // 마커 추가
        const markerPosition = new window.kakao.maps.LatLng(37.5665, 126.9780)
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
        })
        marker.setMap(map)

        // 인포윈도우 추가
        const infowindow = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:10px;">자람동산어린이집</div>',
        })
        infowindow.open(map, marker)
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <SubPageLayout title={menuData.about.title} menuItems={menuData.about.items}>
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          오시는길
        </h2>
        <p className="text-lg text-gray-600">
          자람동산어린이집을 찾아오시는 방법을 안내합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 지도 */}
        <div className="lg:col-span-2">
          <div
            ref={mapRef}
            className="w-full h-[500px] rounded-xl shadow-sm bg-gray-200"
          />
        </div>

        {/* 정보 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">주소</h3>
                <p className="text-gray-600">
                  서울특별시 강남구 테헤란로 123
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">연락처</h3>
                <p className="text-gray-600">
                  전화: 02-1234-5678<br />
                  팩스: 02-1234-5679
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">운영시간</h3>
                <p className="text-gray-600">
                  평일: 07:30 - 19:30<br />
                  토/일/공휴일: 휴무
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">대중교통</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">지하철:</span>
                <p className="mt-1">2호선 강남역 3번 출구에서 도보 5분</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">버스:</span>
                <p className="mt-1">
                  간선버스: 146, 401, 472<br />
                  지선버스: 3414, 4319
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SubPageLayout>
  )
}
