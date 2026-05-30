'use client'

import { useState } from 'react'
import type { FaqItem } from '@/lib/page-types'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaqAccordionProps {
  items: FaqItem[]
  expandStyle: 'single' | 'multiple'
}

export default function FaqAccordion({ items, expandStyle }: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (expandStyle === 'single') next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="divide-y border border-gray-200 rounded-xl overflow-hidden">
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        return (
          <div key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-gray-900 pr-4">{item.question}</span>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </button>
            {isOpen && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
