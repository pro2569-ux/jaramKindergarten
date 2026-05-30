'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Edit,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react'

interface MenuRow {
  id: string
  parent_id: string | null
  label: string
  slug: string
  depth: 0 | 1
  sort_order: number
  is_visible: boolean
  page_id: string | null
}

interface PageOption {
  id: string
  slug: string
  title: string
}

const BLANK_CHILD_FORM = { label: '', slug: '', page_id: '' }

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<MenuRow[]>([])
  const [pages, setPages] = useState<PageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 대분류 추가 폼
  const [showAddParent, setShowAddParent] = useState(false)
  const [addParentForm, setAddParentForm] = useState({ label: '', slug: '' })

  // 소분류 추가 폼 (어느 부모 아래 보여줄지)
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null)
  const [addChildForm, setAddChildForm] = useState(BLANK_CHILD_FORM)

  // 수정 폼 (대/소분류 공용)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(BLANK_CHILD_FORM)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const [{ data: menusData, error: me }, { data: pagesData, error: pe }] = await Promise.all([
        supabase.from('menus').select('*').order('sort_order'),
        supabase.from('pages').select('id, slug, title').order('sort_order'),
      ])
      if (me) throw me
      if (pe) throw pe
      setMenus((menusData as MenuRow[]) || [])
      setPages((pagesData as PageOption[]) || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // ── 파생 데이터 ──────────────────────────────────────
  const parents = menus
    .filter((m) => m.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  const childrenOf = (parentId: string) =>
    menus
      .filter((m) => m.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)

  const pageLabel = (id: string | null) => {
    if (!id) return null
    const p = pages.find((p) => p.id === id)
    return p ? `${p.title} (/${p.slug})` : '알 수 없는 페이지'
  }

  // ── Slug 중복 검사 ────────────────────────────────────
  const isSlugTakenParent = (slug: string, excludeId?: string) =>
    menus.some((m) => m.parent_id === null && m.slug === slug && m.id !== excludeId)

  const isSlugTakenChild = (parentId: string, slug: string, excludeId?: string) =>
    menus.some((m) => m.parent_id === parentId && m.slug === slug && m.id !== excludeId)

  // ── 대분류 추가 ───────────────────────────────────────
  const handleAddParent = async () => {
    const label = addParentForm.label.trim()
    const slug = addParentForm.slug.trim()
    if (!label || !slug) { alert('이름과 슬러그를 모두 입력해주세요.'); return }
    if (isSlugTakenParent(slug)) {
      alert(`슬러그 "${slug}"는 최상위 메뉴에 이미 사용 중입니다.`)
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const maxOrder = parents.length > 0 ? Math.max(...parents.map((p) => p.sort_order)) : 0
      const { error } = await supabase.from('menus').insert({
        label, slug, depth: 0, sort_order: maxOrder + 1, is_visible: true,
        parent_id: null, page_id: null,
      })
      if (error) throw error
      setAddParentForm({ label: '', slug: '' })
      setShowAddParent(false)
      loadData()
    } catch (error: any) {
      alert('추가 중 오류가 발생했습니다: ' + (error.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 소분류 추가 ───────────────────────────────────────
  const handleAddChild = async (parentId: string) => {
    const label = addChildForm.label.trim()
    const slug = addChildForm.slug.trim()
    if (!label || !slug) { alert('이름과 슬러그를 모두 입력해주세요.'); return }
    if (isSlugTakenChild(parentId, slug)) {
      alert(`슬러그 "${slug}"는 이 메뉴 아래에 이미 사용 중입니다.`)
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const siblings = childrenOf(parentId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((c) => c.sort_order)) : 0
      const { error } = await supabase.from('menus').insert({
        label, slug, depth: 1, sort_order: maxOrder + 1, is_visible: true,
        parent_id: parentId, page_id: addChildForm.page_id || null,
      })
      if (error) throw error
      setAddChildForm(BLANK_CHILD_FORM)
      setAddChildParentId(null)
      loadData()
    } catch (error: any) {
      alert('추가 중 오류가 발생했습니다: ' + (error.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 수정 시작 ─────────────────────────────────────────
  const startEdit = (menu: MenuRow) => {
    setEditingId(menu.id)
    setEditForm({ label: menu.label, slug: menu.slug, page_id: menu.page_id || '' })
    setShowAddParent(false)
    setAddChildParentId(null)
  }

  // ── 수정 저장 ─────────────────────────────────────────
  const handleSaveEdit = async (menu: MenuRow) => {
    const label = editForm.label.trim()
    const slug = editForm.slug.trim()
    if (!label || !slug) { alert('이름과 슬러그를 모두 입력해주세요.'); return }

    const duplicated = menu.parent_id === null
      ? isSlugTakenParent(slug, menu.id)
      : isSlugTakenChild(menu.parent_id, slug, menu.id)
    if (duplicated) { alert(`슬러그 "${slug}"는 이미 사용 중입니다.`); return }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      // 대분류는 page_id를 건드리지 않는다(UI에서 노출 안 함)
      const updates: Record<string, string | null> = { label, slug }
      if (menu.parent_id !== null) updates.page_id = editForm.page_id || null

      const { error } = await supabase.from('menus').update(updates).eq('id', menu.id)
      if (error) throw error
      setEditingId(null)
      loadData()
    } catch (error: any) {
      alert('수정 중 오류가 발생했습니다: ' + (error.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 표시여부 토글 ─────────────────────────────────────
  const handleToggleVisible = async (id: string, current: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('menus').update({ is_visible: !current }).eq('id', id)
      if (error) throw error
      loadData()
    } catch (error: any) {
      alert('상태 변경 중 오류가 발생했습니다: ' + (error.message || ''))
    }
  }

  // ── 순서 변경 (같은 레벨 내 swap) ────────────────────
  const handleMove = async (list: MenuRow[], id: string, direction: 'up' | 'down') => {
    const idx = list.findIndex((m) => m.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === list.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    try {
      const supabase = createClient()
      await Promise.all([
        supabase.from('menus').update({ sort_order: list[swapIdx].sort_order }).eq('id', list[idx].id),
        supabase.from('menus').update({ sort_order: list[idx].sort_order }).eq('id', list[swapIdx].id),
      ])
      loadData()
    } catch (error: any) {
      alert('순서 변경 중 오류가 발생했습니다: ' + (error.message || ''))
    }
  }

  // ── 삭제 ─────────────────────────────────────────────
  const handleDelete = async (menu: MenuRow) => {
    const isParent = menu.parent_id === null
    const children = isParent ? childrenOf(menu.id) : []
    const cascadeMsg = children.length > 0
      ? `\n\n⚠️ 이 메뉴에는 소분류 ${children.length}개가 있습니다. 함께 삭제됩니다.`
      : ''
    if (!confirm(`"${menu.label}" 메뉴를 삭제하시겠습니까?${cascadeMsg}\n\n이 작업은 되돌릴 수 없습니다.`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('menus').delete().eq('id', menu.id)
      if (error) throw error
      if (editingId === menu.id) setEditingId(null)
      loadData()
    } catch (error: any) {
      alert('삭제 중 오류가 발생했습니다: ' + (error.message || ''))
    }
  }

  // ── 렌더 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">메뉴 관리</h1>
          <p className="mt-2 text-gray-600">상단 메뉴 구조와 소분류를 관리합니다</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setShowAddParent(!showAddParent)
            setEditingId(null)
            setAddChildParentId(null)
          }}
        >
          {showAddParent ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddParent ? '취소' : '대분류 추가'}
        </Button>
      </div>

      {/* 대분류 추가 폼 */}
      {showAddParent && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">새 대분류 추가</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="메뉴 이름"
                value={addParentForm.label}
                onChange={(e) => setAddParentForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="예: 어린이집소개"
              />
              <Input
                label="슬러그 (URL 경로, 영문 소문자)"
                value={addParentForm.slug}
                onChange={(e) => setAddParentForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="예: about"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddParent(false)}>취소</Button>
              <Button size="sm" onClick={handleAddParent} disabled={isSubmitting} className="gap-1">
                <Save className="w-4 h-4" />추가
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메뉴 트리 */}
      <div className="space-y-3">
        {parents.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              등록된 메뉴가 없습니다. 대분류를 추가해주세요.
            </CardContent>
          </Card>
        )}

        {parents.map((parent, pIdx) => {
          const children = childrenOf(parent.id)
          const isEditingThisParent = editingId === parent.id

          return (
            <Card key={parent.id} className="overflow-hidden">
              <CardContent className="p-0">

                {/* ── 대분류 행 ── */}
                {isEditingThisParent ? (
                  <div className="flex items-end gap-3 px-4 py-3 bg-blue-50 border-b">
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <Input
                        label="메뉴 이름"
                        value={editForm.label}
                        onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                      />
                      <Input
                        label="슬러그 (영문 소문자)"
                        value={editForm.slug}
                        onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 pb-0.5">
                      <Button size="sm" onClick={() => handleSaveEdit(parent)} disabled={isSubmitting} className="gap-1">
                        <Save className="w-4 h-4" />저장
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
                    {/* 순서 버튼 */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleMove(parents, parent.id, 'up')}
                        disabled={pIdx === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                        title="위로"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(parents, parent.id, 'down')}
                        disabled={pIdx === parents.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                        title="아래로"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 레이블 */}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900">{parent.label}</span>
                      <span className="ml-2 text-sm text-gray-500">/{parent.slug}</span>
                      <span className="ml-2 text-xs text-gray-400">소분류 {children.length}개</span>
                    </div>

                    {/* 표시여부 토글 */}
                    <button
                      onClick={() => handleToggleVisible(parent.id, parent.is_visible)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded transition-colors flex-shrink-0',
                        parent.is_visible
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {parent.is_visible
                        ? <><Eye className="w-3 h-3" /> 표시</>
                        : <><EyeOff className="w-3 h-3" /> 숨김</>}
                    </button>

                    <Button variant="ghost" size="sm" onClick={() => startEdit(parent)} className="gap-1 flex-shrink-0">
                      <Edit className="w-4 h-4" />수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-red-600 hover:text-red-700 flex-shrink-0"
                      onClick={() => handleDelete(parent)}
                    >
                      <Trash2 className="w-4 h-4" />삭제
                    </Button>
                  </div>
                )}

                {/* ── 소분류 목록 ── */}
                <div className="divide-y">
                  {children.map((child, cIdx) => {
                    const isEditingThisChild = editingId === child.id
                    return (
                      <div key={child.id}>
                        {isEditingThisChild ? (
                          /* 소분류 수정 모드 */
                          <div className="flex items-end gap-3 px-8 py-3 bg-blue-50 flex-wrap">
                            <div className="flex gap-3 flex-1 flex-wrap">
                              <div className="flex-1 min-w-36">
                                <Input
                                  label="메뉴 이름"
                                  value={editForm.label}
                                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                                />
                              </div>
                              <div className="flex-1 min-w-28">
                                <Input
                                  label="슬러그 (영문 소문자)"
                                  value={editForm.slug}
                                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                                />
                              </div>
                              <div className="flex-1 min-w-44">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  연결 페이지
                                </label>
                                <select
                                  value={editForm.page_id}
                                  onChange={(e) => setEditForm((f) => ({ ...f, page_id: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">연결 없음</option>
                                  {pages.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} (/{p.slug})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2 pb-0.5">
                              <Button size="sm" onClick={() => handleSaveEdit(child)} disabled={isSubmitting} className="gap-1">
                                <Save className="w-4 h-4" />저장
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* 소분류 일반 모드 */
                          <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50">
                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-4" />

                            {/* 순서 버튼 */}
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => handleMove(children, child.id, 'up')}
                                disabled={cIdx === 0}
                                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMove(children, child.id, 'down')}
                                disabled={cIdx === children.length - 1}
                                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            {/* 레이블 */}
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-800">{child.label}</span>
                              <span className="ml-2 text-sm text-gray-500">/{child.slug}</span>
                              {child.page_id && (
                                <span className="ml-2 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                                  {pageLabel(child.page_id)}
                                </span>
                              )}
                            </div>

                            {/* 표시여부 토글 */}
                            <button
                              onClick={() => handleToggleVisible(child.id, child.is_visible)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded transition-colors flex-shrink-0',
                                child.is_visible
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              )}
                            >
                              {child.is_visible
                                ? <><Eye className="w-3 h-3" /> 표시</>
                                : <><EyeOff className="w-3 h-3" /> 숨김</>}
                            </button>

                            <Button variant="ghost" size="sm" onClick={() => startEdit(child)} className="gap-1 flex-shrink-0">
                              <Edit className="w-4 h-4" />수정
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700 flex-shrink-0"
                              onClick={() => handleDelete(child)}
                            >
                              <Trash2 className="w-4 h-4" />삭제
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ── 소분류 추가 폼 ── */}
                  {addChildParentId === parent.id && (
                    <div className="px-8 py-3 bg-green-50 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">소분류 추가</h4>
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="flex-1 min-w-36">
                          <Input
                            label="메뉴 이름"
                            value={addChildForm.label}
                            onChange={(e) => setAddChildForm((f) => ({ ...f, label: e.target.value }))}
                            placeholder="예: 원장 인사말"
                          />
                        </div>
                        <div className="flex-1 min-w-28">
                          <Input
                            label="슬러그 (영문 소문자)"
                            value={addChildForm.slug}
                            onChange={(e) => setAddChildForm((f) => ({ ...f, slug: e.target.value }))}
                            placeholder="예: greeting"
                          />
                        </div>
                        <div className="flex-1 min-w-44">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            연결 페이지 (선택)
                          </label>
                          <select
                            value={addChildForm.page_id}
                            onChange={(e) => setAddChildForm((f) => ({ ...f, page_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">연결 없음</option>
                            {pages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} (/{p.slug})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 pb-0.5">
                          <Button size="sm" onClick={() => handleAddChild(parent.id)} disabled={isSubmitting} className="gap-1">
                            <Save className="w-4 h-4" />추가
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setAddChildParentId(null); setAddChildForm(BLANK_CHILD_FORM) }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 소분류 추가 버튼 ── */}
                  {addChildParentId !== parent.id && (
                    <div className="px-9 py-2">
                      <button
                        onClick={() => {
                          setAddChildParentId(parent.id)
                          setAddChildForm(BLANK_CHILD_FORM)
                          setEditingId(null)
                          setShowAddParent(false)
                        }}
                        className="flex items-center gap-1 text-sm text-primary hover:underline font-medium py-1"
                      >
                        <Plus className="w-4 h-4" />소분류 추가
                      </button>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
