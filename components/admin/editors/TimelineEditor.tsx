'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface TimelineItem {
  date: string
  title: string
  description?: string
}

interface Props {
  value: TimelineItem[]
  onChange: (items: TimelineItem[]) => void
}

export default function TimelineEditor({ value, onChange }: Props) {
  const [items, setItems] = useState<TimelineItem[]>(value || [])

  const update = (newItems: TimelineItem[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    update([...items, { date: '', title: '', description: '' }])
  }

  const removeItem = (index: number) => {
    update(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof TimelineItem, val: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    update(newItems)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">타임라인 항목</label>
        <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> 항목 추가
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400 border rounded-lg border-dashed">타임라인 항목을 추가해주세요.</div>
      )}

      {items.map((item, i) => (
        <div key={i} className="flex gap-3 p-4 border rounded-lg bg-gray-50">
          <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-[120px_1fr] gap-3">
            <input
              type="text"
              placeholder="날짜 (예: 2020.03)"
              value={item.date}
              onChange={(e) => updateItem(i, 'date', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="제목"
              value={item.title}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <textarea
              placeholder="설명 (선택)"
              value={item.description || ''}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              className="px-3 py-2 border rounded text-sm col-span-2 resize-none"
              rows={2}
            />
          </div>
          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 mt-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
