import type { Page } from '@/types/database'
import type { TimelineLayoutConfig, TimelineItem } from '@/lib/page-types'
import { Clock } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

function VerticalTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      {/* 세로 연결선 */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-primary/20" />
      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="relative flex gap-6 pl-12">
            {/* 도트 */}
            <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-sm" />
            {/* 카드 */}
            <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-primary mb-1">{formatDate(item.date)}</p>
              <p className="font-semibold text-gray-900">{item.title}</p>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HorizontalTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max">
        {items.map((item, idx) => (
          <div key={item.id} className="relative flex flex-col items-center w-52">
            {/* 가로 연결선 + 도트 */}
            <div className="flex items-center w-full">
              <div
                className={cn('h-0.5 flex-1', idx === 0 ? 'bg-transparent' : 'bg-primary/30')}
              />
              <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 z-10 shadow-sm" />
              <div
                className={cn(
                  'h-0.5 flex-1',
                  idx === items.length - 1 ? 'bg-transparent' : 'bg-primary/30'
                )}
              />
            </div>
            {/* 날짜 + 내용 */}
            <div className="mt-3 text-center px-3">
              <p className="text-xs font-semibold text-primary">{formatDate(item.date)}</p>
              <p className="font-medium text-gray-900 mt-1 text-sm">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TimelineRenderer({ page }: { page: Page }) {
  const config    = (page.layout_config ?? {}) as TimelineLayoutConfig
  const items     = Array.isArray(config.items) ? config.items : []
  const direction = config.direction ?? 'vertical'

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>등록된 타임라인 항목이 없습니다.</p>
      </div>
    )
  }

  return direction === 'horizontal'
    ? <HorizontalTimeline items={items} />
    : <VerticalTimeline items={items} />
}
