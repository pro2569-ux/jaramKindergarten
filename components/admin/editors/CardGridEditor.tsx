'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface CardItem {
  title: string
  subtitle?: string
  description?: string
  image_url?: string
}

interface Props {
  value: CardItem[]
  onChange: (items: CardItem[]) => void
}

export default function CardGridEditor({ value, onChange }: Props) {
  const [items, setItems] = useState<CardItem[]>(value || [])

  const update = (newItems: CardItem[]) => {
    setItems(newItems)
    onChange(newItems)
  }

  const addItem = () => {
    update([...items, { title: '', subtitle: '', description: '', image_url: '' }])
  }

  const removeItem = (index: number) => {
    update(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof CardItem, val: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    update(newItems)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">카드 아이템</label>
        <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> 아이템 추가
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400 border rounded-lg border-dashed">아이템을 추가해주세요.</div>
      )}

      {items.map((item, i) => (
        <div key={i} className="flex gap-3 p-4 border rounded-lg bg-gray-50">
          <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="제목"
              value={item.title}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              className="px-3 py-2 border rounded text-sm col-span-2"
            />
            <input
              type="text"
              placeholder="부제목 (선택)"
              value={item.subtitle || ''}
              onChange={(e) => updateItem(i, 'subtitle', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="이미지 URL (선택)"
              value={item.image_url || ''}
              onChange={(e) => updateItem(i, 'image_url', e.target.value)}
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
