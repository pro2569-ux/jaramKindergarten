'use client'

import { RendererProps } from './types'

interface TimelineItem {
  date: string
  title: string
  description?: string
}

export default function TimelineRenderer({ page, layoutConfig }: RendererProps) {
  const direction = layoutConfig.direction || 'vertical'

  let items: TimelineItem[] = []
  try {
    if (page.content) {
      items = JSON.parse(page.content)
    }
  } catch {
    items = []
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
        <div className="text-center text-gray-400 py-12">등록된 항목이 없습니다.</div>
      </div>
    )
  }

  if (direction === 'horizontal') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
        <div className="flex overflow-x-auto gap-8 pb-4">
          {items.map((item, index) => (
            <div key={index} className="flex-shrink-0 w-56 text-center">
              <div className="w-4 h-4 bg-primary rounded-full mx-auto" />
              <div className="w-px h-6 bg-primary mx-auto" />
              <div className="border rounded-lg p-4">
                <p className="text-sm font-bold text-primary">{item.date}</p>
                <h3 className="font-medium text-gray-800 mt-1">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-8">
          {items.map((item, index) => (
            <div key={index} className="relative pl-12">
              <div className="absolute left-2.5 top-1 w-3 h-3 bg-primary rounded-full ring-4 ring-white" />
              <p className="text-sm font-bold text-primary">{item.date}</p>
              <h3 className="font-medium text-gray-800 mt-1">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
