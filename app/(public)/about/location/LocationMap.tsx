'use client'

import { useEffect, useRef } from 'react'

// 카카오맵 (클라이언트 전용). 페이지 셸·정보 카드는 서버 컴포넌트(page.tsx)에서 렌더링.
export default function LocationMap() {
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
    <div
      ref={mapRef}
      role="img"
      aria-label="자람동산어린이집 위치 지도"
      className="h-[400px] w-full rounded-card border border-border bg-gray-100 lg:h-[500px]"
    />
  )
}
