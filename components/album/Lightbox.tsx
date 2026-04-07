'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Photo {
  id: string
  image_url: string
  caption: string | null
}

interface LightboxProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, handlePrev, handleNext])

  const currentPhoto = photos[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="닫기"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 이전 버튼 */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev() }}
          className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="이전 사진"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* 이미지 */}
      <div
        className="relative w-full h-full max-w-5xl max-h-[85vh] mx-16"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={currentPhoto.image_url}
          alt={currentPhoto.caption || '사진'}
          fill
          className="object-contain"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority
        />
      </div>

      {/* 다음 버튼 */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext() }}
          className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="다음 사진"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* 하단 정보 */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="text-center text-white">
          {currentPhoto.caption && (
            <p className="text-lg mb-2">{currentPhoto.caption}</p>
          )}
          <p className="text-sm text-white/70">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>
    </div>
  )
}
