'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  value: FaqItem[]
  onChange: (items: FaqItem[]) => void
}

export default function FaqEditor({ value, onChange }: Props) {
  const [items, setItems] = useState<FaqItem[]>(value || [])

  const update = (newItems: FaqItem[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    update([...items, { question: '', answer: '' }])
  }

  const removeItem = (index: number) => {
    update(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof FaqItem, val: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    update(newItems)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Q&A 항목</label>
        <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> 항목 추가
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400 border rounded-lg border-dashed">Q&A 항목을 추가해주세요.</div>
      )}

      {items.map((item, i) => (
        <div key={i} className="flex gap-3 p-4 border rounded-lg bg-gray-50">
          <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-sm">Q.</span>
              <input
                type="text"
                placeholder="질문을 입력하세요"
                value={item.question}
                onChange={(e) => updateItem(i, 'question', e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-sm mt-2">A.</span>
              <textarea
                placeholder="답변을 입력하세요"
                value={item.answer}
                onChange={(e) => updateItem(i, 'answer', e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 mt-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
