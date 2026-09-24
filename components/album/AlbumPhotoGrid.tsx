'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react'

export interface GridPhoto {
  id: string
  image_url: string | null
  caption: string | null
}

interface AlbumPhotoGridProps {
  photos: GridPhoto[]
  albumTitle: string
}

/** 첫 화면에 보이는 사진 수 (PC 4열 2줄) — 이만큼은 먼저 받고, 나머지는 스크롤할 때 받는다 */
const EAGER_COUNT = 8
/** 그중 가장 먼저 받을 사진 (모바일 첫 화면 2열 2줄) */
const HIGH_PRIORITY_COUNT = 4

/**
 * 앨범 사진 격자 + 크게 보기.
 * - 격자: 화면 크기에 맞춘 사본(next/image, 화질 90). 정사각형 칸을 가로 사진이 꽉 채우므로(cover)
 *   필요한 폭이 칸의 약 1.5배 → sizes 를 그만큼 잡아 레티나에서도 흐리지 않게 한다.
 * - 크게 보기: 저장된 원본 파일 그대로(추가 압축·크기 변경 없음). ←/→ 로 넘기고 Esc 로 닫는다.
 */
export default function AlbumPhotoGrid({ photos, albumTitle }: AlbumPhotoGridProps) {
  const [open, setOpen] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastTrigger = useRef<HTMLElement | null>(null)
  const viewable = photos.filter((p) => p.image_url)

  const close = useCallback(() => {
    setOpen(null)
    lastTrigger.current?.focus()
  }, [])
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + viewable.length) % viewable.length)),
    [viewable.length]
  )

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close, step])

  // 크게 보기에서 다음·이전 원본을 미리 받아 넘길 때 바로 뜨게
  useEffect(() => {
    if (open === null || viewable.length < 2) return
    for (const d of [1, -1]) {
      const p = viewable[(open + d + viewable.length) % viewable.length]
      if (p?.image_url) {
        const img = new window.Image()
        img.src = p.image_url
      }
    }
  }, [open, viewable])

  const current = open === null ? null : viewable[open]

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 md:gap-4 md:p-6 lg:grid-cols-4">
        {photos.map((photo, index) => {
          const viewIndex = viewable.indexOf(photo)
          return (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-control bg-gray-100 transition-shadow hover:shadow-md"
            >
              {photo.image_url ? (
                <button
                  type="button"
                  className="absolute inset-0 h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2"
                  onClick={(e) => {
                    lastTrigger.current = e.currentTarget
                    setOpen(viewIndex)
                  }}
                  aria-label={`${photo.caption || albumTitle} 사진 크게 보기 (${viewIndex + 1}/${viewable.length})`}
                >
                  <Image
                    src={photo.image_url}
                    alt={photo.caption || albumTitle}
                    fill
                    // 칸 폭 × 1.5 (가로 3:2 사진을 정사각형에 cover) — PC 4열 칸 약 190px, 태블릿 3열, 모바일 2열
                    sizes="(min-width: 1024px) 290px, (min-width: 768px) 50vw, 75vw"
                    quality={90}
                    loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
                    fetchPriority={index < HIGH_PRIORITY_COUNT ? 'high' : 'auto'}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ) : null}
              {photo.caption && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="line-clamp-2 text-sm text-white">{photo.caption}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {current && open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${albumTitle} 사진 크게 보기`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/90">
            <span aria-live="polite">
              {open + 1} / {viewable.length}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={current.image_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-control px-3 py-2 hover:bg-white/10"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                원본 열기
              </a>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="닫기"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 md:px-16"
            onClick={(e) => {
              if (e.target === e.currentTarget) close()
            }}
          >
            {/* 저장된 원본 그대로 (next/image 최적화·재압축 없이) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.id}
              src={current.image_url!}
              alt={current.caption || albumTitle}
              className="max-h-full max-w-full object-contain"
              decoding="async"
            />
            {viewable.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-4"
                  aria-label="이전 사진"
                >
                  <ChevronLeft className="h-7 w-7" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-4"
                  aria-label="다음 사진"
                >
                  <ChevronRight className="h-7 w-7" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {current.caption && <p className="px-4 pb-4 text-center text-sm text-white/90">{current.caption}</p>}
        </div>
      )}
    </>
  )
}
