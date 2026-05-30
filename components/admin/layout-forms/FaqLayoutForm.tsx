'use client'

import { useState } from 'react'
import type { FaqLayoutConfig, FaqItem } from '@/lib/page-types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, Edit, Save, X, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'
const TEXTAREA = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-y text-sm'

const BLANK: Omit<FaqItem, 'id'> = { question: '', answer: '' }

export default function FaqLayoutForm({ value, onChange }: Props) {
  const config = value as FaqLayoutConfig
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<FaqItem>({ id: '', question: '', answer: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Omit<FaqItem, 'id'>>(BLANK)

  const setOpt = (key: string, val: unknown) => onChange({ ...value, [key]: val })
  const getItems = (): FaqItem[] => (Array.isArray(config.items) ? config.items : [])
  const setItems = (items: FaqItem[]) => onChange({ ...value, items })

  const move = (idx: number, dir: 'up' | 'down') => {
    const items = getItems()
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === items.length - 1) return
    const next = [...items]
    const si = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[si]] = [next[si], next[idx]]
    setItems(next)
  }

  const startEdit = (item: FaqItem) => {
    setEditingId(item.id)
    setEditDraft({ ...item })
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!editDraft.question.trim()) { alert('질문을 입력해주세요.'); return }
    if (!editDraft.answer.trim()) { alert('답변을 입력해주세요.'); return }
    setItems(getItems().map((it) => it.id === editingId ? { ...editDraft } : it))
    setEditingId(null)
  }

  const saveNew = () => {
    if (!newDraft.question.trim()) { alert('질문을 입력해주세요.'); return }
    if (!newDraft.answer.trim()) { alert('답변을 입력해주세요.'); return }
    setItems([...getItems(), { id: crypto.randomUUID(), ...newDraft }])
    setIsAdding(false)
    setNewDraft(BLANK)
  }

  const del = (item: FaqItem) => {
    if (!confirm(`"${item.question}" 항목을 삭제하시겠습니까?`)) return
    setItems(getItems().filter((it) => it.id !== item.id))
    if (editingId === item.id) setEditingId(null)
  }

  const items = getItems()

  return (
    <div className="space-y-4">
      {/* 표시 옵션 */}
      <div className="max-w-xs">
        <label className={LABEL}>펼침 방식</label>
        <select className={SELECT} value={config.expandStyle ?? 'multiple'} onChange={(e) => setOpt('expandStyle', e.target.value)}>
          <option value="multiple">여러 개 동시 열기 가능</option>
          <option value="single">하나만 열기 (아코디언)</option>
        </select>
      </div>

      {/* Q&A 항목 목록 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Q&A 항목 ({items.length}개)</p>
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
                  <Input label="질문 *" value={editDraft.question} onChange={(e) => setEditDraft((d) => ({ ...d, question: e.target.value }))} />
                  <div>
                    <label className={LABEL}>답변 *</label>
                    <textarea rows={3} className={TEXTAREA} value={editDraft.answer} onChange={(e) => setEditDraft((d) => ({ ...d, answer: e.target.value }))} placeholder="답변을 입력하세요" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="w-4 h-4" />저장</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <button onClick={() => move(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => move(idx, 'down')} disabled={idx === items.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.question}</p>
                    <p className="text-xs text-gray-500 truncate">{item.answer}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => del(item)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 space-y-3">
              <p className="text-sm font-semibold text-gray-700">새 Q&A 추가</p>
              <Input label="질문 *" value={newDraft.question} onChange={(e) => setNewDraft((d) => ({ ...d, question: e.target.value }))} placeholder="예: 입학 신청은 어떻게 하나요?" />
              <div>
                <label className={LABEL}>답변 *</label>
                <textarea rows={3} className={TEXTAREA} value={newDraft.answer} onChange={(e) => setNewDraft((d) => ({ ...d, answer: e.target.value }))} placeholder="답변을 입력하세요" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewDraft(BLANK) }}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={saveNew} className="gap-1"><Save className="w-4 h-4" />추가</Button>
              </div>
            </div>
          )}

          {items.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 text-center py-6">등록된 Q&A 항목이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
