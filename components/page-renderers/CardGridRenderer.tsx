'use client'

import Image from 'next/image'
import { RendererProps } from './types'

interface CardItem {
  title: string
  description?: string
  image_url?: string
  subtitle?: string
}

const colsMap = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
const styleMap = {
  bordered: 'border border-gray-200',
  shadow: 'shadow-md',
  flat: 'bg-gray-50',
}

export default function CardGridRenderer({ page, layoutConfig }: RendererProps) {
  const cols = colsMap[layoutConfig.columns as keyof typeof colsMap] || 'grid-cols-3'
  const cardStyle = styleMap[layoutConfig.cardStyle as keyof typeof styleMap] || 'shadow-md'

  // layout_config 또는 content(JSON)에서 카드 아이템 읽기
  let items: CardItem[] = []
  try {
    if (page.content) {
      items = JSON.parse(page.content)
    }
  } catch {
    items = []
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      {items.length === 0 ? (
        <div className="text-center text-gray-400 py-12">등록된 항목이 없습니다.</div>
      ) : (
        <div className={`grid ${cols} gap-6`}>
          {items.map((item, index) => (
            <div key={index} className={`rounded-xl overflow-hidden ${cardStyle}`}>
              {item.image_url && (
                <div className="relative aspect-[4/3] bg-gray-100">
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-gray-800">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-sm text-primary mt-1">{item.subtitle}</p>
                )}
                {item.description && (
                  <p className="text-sm text-gray-500 mt-2">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
