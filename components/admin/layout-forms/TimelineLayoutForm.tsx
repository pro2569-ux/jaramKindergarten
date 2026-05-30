'use client'

import { useState } from 'react'
import type { TimelineLayoutConfig, TimelineItem } from '@/lib/page-types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, Edit, Save, X, ArrowUp, ArrowDown, Clock } from 'lucide-react'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'
const TEXTAREA = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-y text-sm'

const BLANK: Omit<TimelineItem, 'id'> = { date: '', title: '', description: '' }

export default function TimelineLayoutForm({ value, onChange }: Props) {
  const config = value as TimelineLayoutConfig
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TimelineItem>({ id: '', date: '', title: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Omit<TimelineItem, 'id'>>(BLANK)

  const setOpt = (key: string, val: unknown) => onChange({ ...value, [key]: val })
  const getItems = (): TimelineItem[] => (Array.isArray(config.items) ? config.items : [])
  const setItems = (items: TimelineItem[]) => onChange({ ...value, items })

  const move = (idx: number, dir: 'up' | 'down') => {
    const items = getItems()
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === items.length - 1) return
    const next = [...items]
    const si = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[si]] = [next[si], next[idx]]
    setItems(next)
  }

  const startEdit = (item: TimelineItem) => {
    setEditingId(item.id)
    setEditDraft({ ...item })
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!editDraft.date.trim()) { alert('날짜를 입력해주세요.'); return }
    if (!editDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    setItems(getItems().map((it) => it.id === editingId ? { ...editDraft } : it))
    setEditingId(null)
  }

  const saveNew = () => {
    if (!newDraft.date.trim()) { alert('날짜를 입력해주세요.'); return }
    if (!newDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    setItems([...getItems(), { id: crypto.randomUUID(), ...newDraft }])
    setIsAdding(false)
    setNewDraft(BLANK)
  }

  const del = (item: TimelineItem) => {
    if (!confirm(`"${item.title}" 항목을 삭제하시겠습니까?`)) return
    setItems(getItems().filter((it) => it.id !== item.id))
    if (editingId === item.id) setEditingId(null)
  }

  const items = getItems()

  return (
    <div className="space-y-4">
      {/* 표시 옵션 */}
      <div className="max-w-xs">
        <label className={LABEL}>방향</label>
        <select className={SELECT} value={config.direction ?? 'vertical'} onChange={(e) => setOpt('direction', e.target.value)}>
          <option value="vertical">세로 (vertical)</option>
          <option value="horizontal">가로 (horizontal)</option>
        </select>
      </div>

      {/* 타임라인 항목 목록 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">타임라인 항목 ({items.length}개)</p>
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
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="날짜 *" type="date" value={editDraft.date} onChange={(e) => setEditDraft((d) => ({ ...d, date: e.target.value }))} />
                    <Input label="제목 *" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className={LABEL}>설명 (선택)</label>
                    <textarea rows={2} className={TEXTAREA} value={editDraft.description ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))} placeholder="추가 설명" />
                  </div>
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
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      <span className="text-primary mr-2">{item.date}</span>{item.title}
                    </p>
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
              <p className="text-sm font-semibold text-gray-700">새 항목 추가</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="날짜 *" type="date" value={newDraft.date} onChange={(e) => setNewDraft((d) => ({ ...d, date: e.target.value }))} />
                <Input label="제목 *" value={newDraft.title} onChange={(e) => setNewDraft((d) => ({ ...d, title: e.target.value }))} placeholder="예: 어린이집 개원" />
              </div>
              <div>
                <label className={LABEL}>설명 (선택)</label>
                <textarea rows={2} className={TEXTAREA} value={newDraft.description ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, description: e.target.value }))} placeholder="추가 설명" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewDraft(BLANK) }}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={saveNew} className="gap-1"><Save className="w-4 h-4" />추가</Button>
              </div>
            </div>
          )}

          {items.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 text-center py-6">등록된 타임라인 항목이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
