'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from './Lightbox'

interface Photo {
  id: string
  image_url: string
  caption: string | null
}

interface PhotoGridProps {
  photos: Photo[]
  albumTitle: string
}

export default function PhotoGrid({ photos, albumTitle }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLightboxIndex(index)}
          >
            <Image
              src={photo.image_url}
              alt={photo.caption || albumTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm line-clamp-2">
                  {photo.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
