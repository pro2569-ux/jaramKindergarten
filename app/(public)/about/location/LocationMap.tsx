'use client'

import { useEffect, useRef, useState } from 'react'

interface LocationMapProps {
  /** 지오코딩·검색 링크에 쓰는 주소 */
  address: string
  /** 마커 말풍선 이름 */
  name: string
  /** 사이트 설정의 좌표 (없으면 주소를 지오코딩) */
  lat?: number | null
  lng?: number | null
}

type MapState = 'loading' | 'ready' | 'error'

// 카카오맵 (클라이언트 전용). 키는 NEXT_PUBLIC_KAKAO_MAP_KEY (JavaScript 키) — 빌드 시 주입되므로 Vercel 환경변수에 있어야 한다.
// 좌표가 없으면 services 라이브러리로 주소를 지오코딩한다. SDK 로드 실패(키 없음·도메인 미등록)면 안내와 카카오맵 링크를 보여 준다.
export default function LocationMap({ address, name, lat, lng }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // 키는 빌드 시 인라인되므로 렌더 시점에 알 수 있다 → 없으면 처음부터 안내 상태 (effect 안에서 동기 setState 하지 않음)
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
  const [state, setState] = useState<MapState>(key ? 'loading' : 'error')
  const [reason, setReason] = useState<string>(key ? '' : '지도 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 설정되지 않았습니다.')
  const searchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`

  useEffect(() => {
    if (!key) return
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`
    script.async = true
    // 5초 안에 로드되지 않으면(키 오류·도메인 미등록으로 스크립트가 차단되면 onerror 가 안 올 수 있음) 안내로 전환
    const timer = window.setTimeout(() => {
      setReason('지도 스크립트를 불러오지 못했습니다. (키 또는 허용 도메인 설정을 확인하세요)')
      setState((s) => (s === 'ready' ? s : 'error'))
    }, 5000)
    script.onerror = () => {
      window.clearTimeout(timer)
      setReason('지도 스크립트를 불러오지 못했습니다. (키 또는 허용 도메인 설정을 확인하세요)')
      setState('error')
    }
    script.onload = () => {
      const kakao = window.kakao
      if (!kakao?.maps) {
        window.clearTimeout(timer)
        setReason('지도 SDK 응답이 올바르지 않습니다.')
        setState('error')
        return
      }
      kakao.maps.load(() => {
        window.clearTimeout(timer)
        const container = mapRef.current
        if (!container) return
        const draw = (position: unknown) => {
          const map = new kakao.maps.Map(container, { center: position, level: 3 })
          const marker = new kakao.maps.Marker({ position })
          marker.setMap(map)
          const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap">${name.replace(/</g, '&lt;')}</div>`,
          })
          infowindow.open(map, marker)
          setState('ready')
        }
        if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
          draw(new kakao.maps.LatLng(lat, lng))
          return
        }
        // 좌표가 없으면 주소로 찾는다
        const geocoder = new kakao.maps.services.Geocoder()
        geocoder.addressSearch(address, (result: Array<{ x: string; y: string }>, status: string) => {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            draw(new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x)))
          } else {
            setReason('주소로 위치를 찾지 못했습니다. 관리자 > 사이트 설정에 위도·경도를 넣어 주세요.')
            setState('error')
          }
        })
      })
    }
    document.head.appendChild(script)
    return () => {
      window.clearTimeout(timer)
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [key, address, name, lat, lng])

  return (
    <div className="relative">
      <div
        ref={mapRef}
        role="img"
        aria-label={`${name} 위치 지도`}
        className="h-[320px] w-full rounded-card border border-border bg-gray-100 md:h-[400px] lg:h-[460px]"
      />
      {state !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-card bg-page/90 p-6 text-center">
          {state === 'loading' ? (
            <p className="text-sm text-muted">지도를 불러오는 중…</p>
          ) : (
            <>
              <p className="text-sm text-muted">지도를 표시할 수 없어요. {reason}</p>
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-control bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary-dark"
              >
                카카오맵에서 위치 보기
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}
