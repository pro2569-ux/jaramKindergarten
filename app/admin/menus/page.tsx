'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PAGE_TYPES, PageType } from '@/lib/page-types'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Save,
  X,
  GripVertical,
} from 'lucide-react'

interface Menu {
  id: string
  parent_id: string | null
  label: string
  slug: string
  page_id: string | null
  sort_order: number
  is_visible: boolean
  depth: number
  page_type?: string
  children?: Menu[]
}

interface MenuForm {
  label: string
  slug: string
  page_type?: PageType
}

export default function MenuManagementPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<MenuForm>({ label: '', slug: '' })
  const [addingParentId, setAddingParentId] = useState<string | null | 'root'>(null)
  const [addForm, setAddForm] = useState<MenuForm>({ label: '', slug: '', page_type: 'single' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchMenus = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('menus')
      .select('*, pages(page_type)')
      .order('sort_order', { ascending: true })

    if (error) {
      alert(`메뉴 조회 실패: ${error.message}`)
      setLoading(false)
      return
    }

    // 트리 구조로 변환
    const parents = (data || [])
      .filter((m: any) => m.depth === 0)
      .map((parent: any) => ({
        ...parent,
        page_type: parent.pages?.page_type,
        children: (data || [])
          .filter((c: any) => c.parent_id === parent.id)
          .map((child: any) => ({
            ...child,
            page_type: child.pages?.page_type,
          }))
          .sort((a: Menu, b: Menu) => a.sort_order - b.sort_order),
      }))
      .sort((a: Menu, b: Menu) => a.sort_order - b.sort_order)

    setMenus(parents)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMenus()
  }, [fetchMenus])

  // 대분류 추가
  const handleAddParent = async () => {
    if (!addForm.label.trim() || !addForm.slug.trim()) {
      alert('메뉴 이름과 URL 경로를 입력해주세요.')
      return
    }

    setSaving(true)
    const maxOrder = menus.length > 0 ? Math.max(...menus.map((m) => m.sort_order)) : 0

    const { error } = await supabase.from('menus').insert({
      label: addForm.label,
      slug: addForm.slug,
      depth: 0,
      sort_order: maxOrder + 1,
    })

    if (error) {
      alert(`대분류 추가 실패: ${error.message}`)
    } else {
      setAddForm({ label: '', slug: '', page_type: 'single' })
      setAddingParentId(null)
      await fetchMenus()
    }
    setSaving(false)
  }

  // 소분류 추가 (pages 레코드 자동 생성)
  const handleAddChild = async (parentId: string, parentSlug: string) => {
    if (!addForm.label.trim() || !addForm.slug.trim()) {
      alert('메뉴 이름과 URL 경로를 입력해주세요.')
      return
    }

    setSaving(true)

    // 1. pages 레코드 생성
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .insert({
        slug: `${parentSlug}-${addForm.slug}`,
        title: addForm.label,
        category: parentSlug,
        page_type: addForm.page_type || 'single',
        layout_config: {},
        style_config: {},
      })
      .select('id')
      .single()

    if (pageError) {
      alert(`페이지 생성 실패: ${pageError.message}`)
      setSaving(false)
      return
    }

    // 2. menus 레코드 생성 (page_id 연결)
    const parent = menus.find((m) => m.id === parentId)
    const childCount = parent?.children?.length || 0

    const { error: menuError } = await supabase.from('menus').insert({
      parent_id: parentId,
      label: addForm.label,
      slug: addForm.slug,
      page_id: pageData.id,
      depth: 1,
      sort_order: childCount + 1,
    })

    if (menuError) {
      alert(`소분류 추가 실패: ${menuError.message}`)
    } else {
      setAddForm({ label: '', slug: '', page_type: 'single' })
      setAddingParentId(null)
      await fetchMenus()
    }
    setSaving(false)
  }

  // 메뉴 수정
  const handleEdit = async (menu: Menu) => {
    if (!editForm.label.trim() || !editForm.slug.trim()) {
      alert('메뉴 이름과 URL 경로를 입력해주세요.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('menus')
      .update({ label: editForm.label, slug: editForm.slug, updated_at: new Date().toISOString() })
      .eq('id', menu.id)

    if (error) {
      alert(`수정 실패: ${error.message}`)
    } else {
      setEditingId(null)
      await fetchMenus()
    }
    setSaving(false)
  }

  // 메뉴 삭제
  const handleDelete = async (menu: Menu) => {
    const msg = menu.depth === 0
      ? `"${menu.label}" 대분류를 삭제하면 하위 소분류도 모두 삭제됩니다. 계속하시겠습니까?`
      : `"${menu.label}" 소분류를 삭제하시겠습니까?`

    if (!confirm(msg)) return

    const { error } = await supabase.from('menus').delete().eq('id', menu.id)
    if (error) {
      alert(`삭제 실패: ${error.message}`)
    } else {
      await fetchMenus()
    }
  }

  // 공개/비공개 토글
  const handleToggleVisibility = async (menu: Menu) => {
    const { error } = await supabase
      .from('menus')
      .update({ is_visible: !menu.is_visible })
      .eq('id', menu.id)

    if (error) {
      alert(`변경 실패: ${error.message}`)
    } else {
      await fetchMenus()
    }
  }

  // 순서 이동
  const handleMoveOrder = async (menu: Menu, direction: 'up' | 'down', siblings: Menu[]) => {
    const currentIdx = siblings.findIndex((m) => m.id === menu.id)
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return

    const target = siblings[targetIdx]
    const batch = [
      supabase.from('menus').update({ sort_order: target.sort_order }).eq('id', menu.id),
      supabase.from('menus').update({ sort_order: menu.sort_order }).eq('id', target.id),
    ]

    await Promise.all(batch)
    await fetchMenus()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">메뉴 관리</h1>
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">메뉴 관리</h1>
        <button
          onClick={() => {
            setAddingParentId('root')
            setAddForm({ label: '', slug: '', page_type: 'single' })
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          대분류 추가
        </button>
      </div>

      {/* 대분류 추가 폼 */}
      {addingParentId === 'root' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-bold text-gray-700 mb-3">새 대분류 추가</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="메뉴 이름 (예: 어린이집소개)"
              value={addForm.label}
              onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <input
              type="text"
              placeholder="URL 경로 (예: about)"
              value={addForm.slug}
              onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
              className="w-48 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={handleAddParent}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAddingParentId(null)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 트리 */}
      <div className="space-y-3">
        {menus.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-lg border">
            등록된 메뉴가 없습니다. 대분류를 추가해주세요.
          </div>
        ) : (
          menus.map((parent, parentIdx) => (
            <div key={parent.id} className="bg-white border rounded-lg overflow-hidden">
              {/* 대분류 행 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                <GripVertical className="w-4 h-4 text-gray-300" />

                {editingId === parent.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      className="w-32 px-2 py-1 border rounded text-sm"
                    />
                    <button
                      onClick={() => handleEdit(parent)}
                      disabled={saving}
                      className="p-1 text-primary hover:bg-green-50 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-bold text-gray-800">{parent.label}</span>
                    <span className="text-xs text-gray-400 font-mono">/{parent.slug}</span>
                  </>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleVisibility(parent)}
                    className={`p-1.5 rounded ${parent.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                    title={parent.is_visible ? '공개' : '비공개'}
                  >
                    {parent.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleMoveOrder(parent, 'up', menus)}
                    disabled={parentIdx === 0}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-20"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(parent, 'down', menus)}
                    disabled={parentIdx === menus.length - 1}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-20"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(parent.id)
                      setEditForm({ label: parent.label, slug: parent.slug })
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(parent)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 소분류 리스트 */}
              <div className="divide-y">
                {parent.children?.map((child, childIdx) => (
                  <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-gray-50">
                    <span className="text-gray-300">├</span>

                    {editingId === child.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editForm.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="text"
                          value={editForm.slug}
                          onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                          className="w-32 px-2 py-1 border rounded text-sm"
                        />
                        <button
                          onClick={() => handleEdit(child)}
                          disabled={saving}
                          className="p-1 text-primary hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-700">{child.label}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                          {PAGE_TYPES[child.page_type as PageType]?.label || child.page_type}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">/{parent.slug}/{child.slug}</span>
                      </>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleVisibility(child)}
                        className={`p-1 rounded ${child.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                      >
                        {child.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleMoveOrder(child, 'up', parent.children || [])}
                        disabled={childIdx === 0}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(child, 'down', parent.children || [])}
                        disabled={childIdx === (parent.children?.length || 0) - 1}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(child.id)
                          setEditForm({ label: child.label, slug: child.slug })
                        }}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(child)}
                        className="p-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* 소분류 추가 폼 */}
                {addingParentId === parent.id ? (
                  <div className="px-4 py-3 pl-10 bg-green-50">
                    <h4 className="text-xs font-bold text-gray-600 mb-2">새 소분류 추가</h4>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">메뉴 이름</label>
                        <input
                          type="text"
                          placeholder="예: 원장 인사말"
                          value={addForm.label}
                          onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm mt-0.5"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-xs text-gray-500">URL 경로</label>
                        <input
                          type="text"
                          placeholder="예: greeting"
                          value={addForm.slug}
                          onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm mt-0.5"
                        />
                      </div>
                      <div className="w-36">
                        <label className="text-xs text-gray-500">페이지 타입</label>
                        <select
                          value={addForm.page_type}
                          onChange={(e) => setAddForm({ ...addForm, page_type: e.target.value as PageType })}
                          className="w-full px-2 py-1.5 border rounded text-sm mt-0.5"
                        >
                          {Object.entries(PAGE_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleAddChild(parent.id, parent.slug)}
                        disabled={saving}
                        className="p-1.5 bg-primary text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAddingParentId(null)}
                        className="p-1.5 border rounded hover:bg-gray-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingParentId(parent.id)
                      setAddForm({ label: '', slug: '', page_type: 'single' })
                    }}
                    className="w-full px-4 py-2 pl-10 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    소분류 추가
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
