import type { Page } from '@/types/database'
import type { CardGridLayoutConfig, CardItem } from '@/lib/page-types'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutGrid } from 'lucide-react'

const COLUMNS_CLASS: Record<string, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

const CARD_CLASS: Record<string, string> = {
  bordered: 'rounded-xl border border-gray-200 bg-white',
  shadow:   'rounded-xl border border-gray-100 bg-white shadow-md',
  flat:     'rounded-xl bg-gray-50',
}

function CardItemView({ item, cardStyle }: { item: CardItem; cardStyle: string }) {
  const wrapClass = CARD_CLASS[cardStyle] ?? CARD_CLASS.bordered

  const inner = (
    <div className={cn('overflow-hidden h-full', wrapClass)}>
      {item.image_url && (
        <div className="aspect-video relative bg-gray-100">
          <Image src={item.image_url} alt={item.title} fill className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.description}</p>
        )}
      </div>
    </div>
  )

  if (item.link_url) {
    return (
      <Link href={item.link_url} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    )
  }
  return inner
}

export default function CardGridRenderer({ page }: { page: Page }) {
  const config    = (page.layout_config ?? {}) as CardGridLayoutConfig
  const items     = Array.isArray(config.items) ? config.items : []
  const columns   = config.columns   ?? 3
  const cardStyle = config.cardStyle ?? 'bordered'

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>등록된 항목이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-6', COLUMNS_CLASS[String(columns)] ?? COLUMNS_CLASS['3'])}>
      {items.map((item) => (
        <CardItemView key={item.id} item={item} cardStyle={cardStyle} />
      ))}
    </div>
  )
}
