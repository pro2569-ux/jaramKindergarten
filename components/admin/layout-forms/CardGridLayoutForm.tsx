'use client'

import { useState } from 'react'
import type { CardGridLayoutConfig, CardItem } from '@/lib/page-types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, Edit, Save, X, ArrowUp, ArrowDown, LayoutGrid } from 'lucide-react'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'
const TEXTAREA = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-y text-sm'

const BLANK: Omit<CardItem, 'id'> = { title: '', description: '', image_url: '', link_url: '' }

export default function CardGridLayoutForm({ value, onChange }: Props) {
  const config = value as CardGridLayoutConfig
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CardItem>({ id: '', title: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Omit<CardItem, 'id'>>(BLANK)

  const setOpt = (key: string, val: unknown) => onChange({ ...value, [key]: val })
  const getItems = (): CardItem[] => (Array.isArray(config.items) ? config.items : [])
  const setItems = (items: CardItem[]) => onChange({ ...value, items })

  const move = (idx: number, dir: 'up' | 'down') => {
    const items = getItems()
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === items.length - 1) return
    const next = [...items]
    const si = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[si]] = [next[si], next[idx]]
    setItems(next)
  }

  const startEdit = (item: CardItem) => {
    setEditingId(item.id)
    setEditDraft({ ...item })
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!editDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    setItems(getItems().map((it) => it.id === editingId ? { ...editDraft } : it))
    setEditingId(null)
  }

  const saveNew = () => {
    if (!newDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    setItems([...getItems(), { id: crypto.randomUUID(), ...newDraft }])
    setIsAdding(false)
    setNewDraft(BLANK)
  }

  const del = (item: CardItem) => {
    if (!confirm(`"${item.title}" 항목을 삭제하시겠습니까?`)) return
    setItems(getItems().filter((it) => it.id !== item.id))
    if (editingId === item.id) setEditingId(null)
  }

  const items = getItems()

  return (
    <div className="space-y-4">
      {/* 표시 옵션 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>열 수</label>
          <select className={SELECT} value={config.columns ?? 3} onChange={(e) => setOpt('columns', Number(e.target.value))}>
            <option value={2}>2열</option>
            <option value={3}>3열</option>
            <option value={4}>4열</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>카드 스타일</label>
          <select className={SELECT} value={config.cardStyle ?? 'bordered'} onChange={(e) => setOpt('cardStyle', e.target.value)}>
            <option value="bordered">테두리 (bordered)</option>
            <option value="shadow">그림자 (shadow)</option>
            <option value="flat">플랫 (flat)</option>
          </select>
        </div>
      </div>

      {/* 카드 항목 목록 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">카드 항목 ({items.length}개)</p>
          {!isAdding && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setIsAdding(true); setEditingId(null) }}>
              <Plus className="w-4 h-4" />항목 추가
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
                  <Input label="제목 *" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} />
                  <div>
                    <label className={LABEL}>설명 (선택)</label>
                    <textarea rows={2} className={TEXTAREA} value={editDraft.description ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))} placeholder="카드 설명" />
                  </div>
                  <Input label="이미지 URL (선택)" value={editDraft.image_url ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, image_url: e.target.value }))} placeholder="https://..." />
                  <Input label="링크 URL (선택)" value={editDraft.link_url ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, link_url: e.target.value }))} placeholder="https://..." />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="w-4 h-4" />저장</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => move(idx, 'down')} disabled={idx === items.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <LayoutGrid className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => del(item)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 space-y-3">
              <p className="text-sm font-semibold text-gray-700">새 카드 추가</p>
              <Input label="제목 *" value={newDraft.title} onChange={(e) => setNewDraft((d) => ({ ...d, title: e.target.value }))} placeholder="예: 교직원 이름" />
              <div>
                <label className={LABEL}>설명 (선택)</label>
                <textarea rows={2} className={TEXTAREA} value={newDraft.description ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, description: e.target.value }))} placeholder="카드 설명" />
              </div>
              <Input label="이미지 URL (선택)" value={newDraft.image_url ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, image_url: e.target.value }))} placeholder="https://..." />
              <Input label="링크 URL (선택)" value={newDraft.link_url ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, link_url: e.target.value }))} placeholder="https://..." />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewDraft(BLANK) }}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={saveNew} className="gap-1"><Save className="w-4 h-4" />추가</Button>
              </div>
            </div>
          )}

          {items.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 text-center py-6">등록된 카드 항목이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
