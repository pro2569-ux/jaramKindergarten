import type { Page } from '@/types/database'
import type { FaqLayoutConfig } from '@/lib/page-types'
import { HelpCircle } from 'lucide-react'
import FaqAccordion from './FaqAccordion'

export default function FaqRenderer({ page }: { page: Page }) {
  const config      = (page.layout_config ?? {}) as FaqLayoutConfig
  const items       = Array.isArray(config.items) ? config.items : []
  const expandStyle = config.expandStyle ?? 'multiple'

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>등록된 Q&A 항목이 없습니다.</p>
      </div>
    )
  }

  return <FaqAccordion items={items} expandStyle={expandStyle} />
}
