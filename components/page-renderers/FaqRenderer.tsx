'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { RendererProps } from './types'

interface FaqItem {
  question: string
  answer: string
}

export default function FaqRenderer({ page, layoutConfig }: RendererProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set())
  const expandStyle = layoutConfig.expandStyle || 'single'

  let items: FaqItem[] = []
  try {
    if (page.content) {
      items = JSON.parse(page.content)
    }
  } catch {
    items = []
  }

  const toggleIndex = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (expandStyle === 'single') {
          next.clear()
        }
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted">등록된 Q&A가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndexes.has(index)
            return (
              <div key={index} className="border border-border rounded-control overflow-hidden">
                <button
                  onClick={() => toggleIndex(index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800">
                    <span className="text-primary-ink mr-2">Q.</span>
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 py-4 bg-tint border-t border-border">
                    <span className="text-primary-ink font-medium mr-2">A.</span>
                    <span className="text-gray-700">{item.answer}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
