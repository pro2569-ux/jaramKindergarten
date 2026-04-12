'use client'

import { RendererProps } from './types'

const widthMap = {
  narrow: 'max-w-2xl',
  medium: 'max-w-4xl',
  wide: 'max-w-6xl',
}

export default function SinglePageRenderer({ page, layoutConfig }: RendererProps) {
  const width = widthMap[(layoutConfig.width as keyof typeof widthMap)] || 'max-w-4xl'

  return (
    <div className={`${width} mx-auto px-4 py-8`}>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      {page.content && (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  )
}
