'use client'

import { RendererProps } from './types'
import { sanitizeHtml } from '@/lib/sanitize'

const widthMap = {
  narrow: 'max-w-2xl',
  medium: 'max-w-4xl',
  wide: 'max-w-6xl',
}

export default function SinglePageRenderer({ page, layoutConfig }: RendererProps) {
  const width = widthMap[(layoutConfig.width as keyof typeof widthMap)] || 'max-w-4xl'

  return (
    <div className={`${width} mx-auto`}>
      {page.content && (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
        />
      )}
    </div>
  )
}
