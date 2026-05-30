'use client'

import { useState } from 'react'
import type { PdfListLayoutConfig, PdfItem } from '@/lib/page-types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, Edit, Save, X, ArrowUp, ArrowDown, FileText } from 'lucide-react'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

const BLANK: Omit<PdfItem, 'id'> = { title: '', file_url: '', date: '', description: '' }

export default function PdfListLayoutForm({ value, onChange }: Props) {
  const config = value as PdfListLayoutConfig
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<PdfItem>({ id: '', title: '', file_url: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Omit<PdfItem, 'id'>>(BLANK)

  const setOpt = (key: string, val: unknown) => onChange({ ...value, [key]: val })
  const getItems = (): PdfItem[] => (Array.isArray(config.items) ? config.items : [])
  const setItems = (items: PdfItem[]) => onChange({ ...value, items })

  const move = (idx: number, dir: 'up' | 'down') => {
    const items = getItems()
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === items.length - 1) return
    const next = [...items]
    const si = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[si]] = [next[si], next[idx]]
    setItems(next)
  }

  const startEdit = (item: PdfItem) => {
    setEditingId(item.id)
    setEditDraft({ ...item })
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!editDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!editDraft.file_url.trim()) { alert('파일 URL을 입력해주세요.'); return }
    setItems(getItems().map((it) => it.id === editingId ? { ...editDraft } : it))
    setEditingId(null)
  }

  const saveNew = () => {
    if (!newDraft.title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!newDraft.file_url.trim()) { alert('파일 URL을 입력해주세요.'); return }
    setItems([...getItems(), { id: crypto.randomUUID(), ...newDraft }])
    setIsAdding(false)
    setNewDraft(BLANK)
  }

  const del = (item: PdfItem) => {
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
          <label className={LABEL}>정렬 기준</label>
          <select className={SELECT} value={config.sortBy ?? 'date'} onChange={(e) => setOpt('sortBy', e.target.value)}>
            <option value="date">날짜순</option>
            <option value="name">이름순</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showPreview ?? false}
              onChange={(e) => setOpt('showPreview', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            미리보기 버튼 표시
          </label>
        </div>
      </div>

      {/* 구분선 + 항목 목록 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">PDF 파일 목록 ({items.length}개)</p>
          {!isAdding && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setIsAdding(true); setEditingId(null) }}>
              <Plus className="w-4 h-4" />파일 추가
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                /* 수정 폼 */
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="제목 *" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} />
                    <Input label="날짜" type="date" value={editDraft.date ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, date: e.target.value }))} />
                  </div>
                  <Input label="파일 URL *" value={editDraft.file_url} onChange={(e) => setEditDraft((d) => ({ ...d, file_url: e.target.value }))} placeholder="https://..." />
                  <Input label="설명 (선택)" value={editDraft.description ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="w-4 h-4" />저장</Button>
                  </div>
                </div>
              ) : (
                /* 일반 행 */
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => move(idx, 'down')} disabled={idx === items.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {item.date && <p className="text-xs text-gray-500">{item.date}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(item)} className="gap-1"><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => del(item)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}

          {/* 추가 폼 */}
          {isAdding && (
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 space-y-3">
              <p className="text-sm font-semibold text-gray-700">새 파일 추가</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="제목 *" value={newDraft.title} onChange={(e) => setNewDraft((d) => ({ ...d, title: e.target.value }))} placeholder="예: 2024년 1월 식단표" />
                <Input label="날짜" type="date" value={newDraft.date ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, date: e.target.value }))} />
              </div>
              <Input label="파일 URL *" value={newDraft.file_url} onChange={(e) => setNewDraft((d) => ({ ...d, file_url: e.target.value }))} placeholder="https://..." />
              <Input label="설명 (선택)" value={newDraft.description ?? ''} onChange={(e) => setNewDraft((d) => ({ ...d, description: e.target.value }))} />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewDraft(BLANK) }}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={saveNew} className="gap-1"><Save className="w-4 h-4" />추가</Button>
              </div>
            </div>
          )}

          {items.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 text-center py-6">등록된 파일이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
