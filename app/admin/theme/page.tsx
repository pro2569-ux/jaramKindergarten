'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Palette, Type, Layout, RotateCcw } from 'lucide-react'
import { THEME_PRESETS, type ThemePreset } from '@/lib/theme-presets'
import { revalidateTheme } from './actions'

interface ThemeData {
  id: string
  name: string
  is_active: boolean
  primary_color: string
  secondary_color: string
  background_color: string
  text_color: string
  heading_font: string
  body_font: string
  header_style: string
}

const fontOptions = [
  { value: 'pretendard', label: 'Pretendard', sample: 'font-sans' },
  { value: 'nanum', label: '나눔고딕', sample: 'font-sans' },
  { value: 'notoserif', label: 'Noto Serif KR', sample: 'font-serif' },
]

const headerStyles = [
  { value: 'default', label: '기본', description: '로고 좌측 + 메뉴 우측 배치' },
  { value: 'centered', label: '중앙 정렬', description: '로고 중앙 + 메뉴 하단 배치' },
  { value: 'minimal', label: '미니멀', description: '로고 + 햄버거 메뉴만 표시' },
]

const defaultTheme: Omit<ThemeData, 'id'> = {
  name: 'default',
  is_active: true,
  primary_color: '#4CAF50',
  secondary_color: '#FF9800',
  background_color: '#ffffff',
  text_color: '#1e293b',
  heading_font: 'pretendard',
  body_font: 'pretendard',
  header_style: 'default',
}

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<ThemeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('site_theme')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // 테마가 없으면 기본값으로 생성
      const { data: newTheme, error: insertError } = await supabase
        .from('site_theme')
        .insert(defaultTheme)
        .select()
        .single()

      if (insertError) {
        alert(`테마 로드 실패: ${insertError.message}`)
      } else {
        setTheme(newTheme)
      }
    } else {
      setTheme(data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!theme) return
    setSaving(true)

    const { error } = await supabase
      .from('site_theme')
      .update({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        background_color: theme.background_color,
        text_color: theme.text_color,
        heading_font: theme.heading_font,
        body_font: theme.body_font,
        header_style: theme.header_style,
      })
      .eq('id', theme.id)

    if (error) {
      alert(`저장 실패: ${error.message}`)
    } else {
      // 전역 테마 캐시(unstable_cache tags:['site-theme']) 무효화 → 저장한 색 즉시 사이트 반영
      await revalidateTheme()
      alert('테마 설정이 저장되었습니다.')
    }
    setSaving(false)
  }

  const handleReset = () => {
    if (!theme) return
    if (confirm('기본 테마로 초기화하시겠습니까?')) {
      setTheme({
        ...theme,
        ...defaultTheme,
      })
    }
  }

  const updateField = (field: keyof ThemeData, value: string) => {
    if (!theme) return
    setTheme({ ...theme, [field]: value })
  }

  // 프리셋: 4색(primary/secondary/background/text)만 폼에 채움 (이름·폰트·헤더 유지).
  // DB 저장 X — 사용자가 "저장"을 눌러야 반영.
  const applyPreset = (preset: ThemePreset) => {
    if (!theme) return
    setTheme({
      ...theme,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      background_color: preset.background,
      text_color: preset.text,
    })
  }

  // 현재 폼 색이 어떤 프리셋과 정확히 일치하는지 (적용됨 표시용)
  const isPresetActive = (p: ThemePreset) => {
    if (!theme) return false
    const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
    return eq(theme.primary_color, p.primary)
      && eq(theme.secondary_color, p.secondary)
      && eq(theme.background_color, p.background)
      && eq(theme.text_color, p.text)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">테마 설정</h1>
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!theme) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">테마 설정</h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 프리셋 팔레트 (원클릭으로 폼 채우기 — 실제 반영은 저장 버튼) */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-1">
          <Palette className="w-5 h-5" />
          프리셋 팔레트
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          원클릭으로 색 조합을 폼에 채웁니다. 실제 사이트 반영은{' '}
          <span className="font-medium text-gray-700">저장</span>을 눌러야 합니다.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {THEME_PRESETS.map((p) => {
            const active = isPresetActive(p)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                aria-pressed={active}
                title={`${p.name} 적용`}
                className={`text-left rounded-xl border p-3 transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary ${
                  active ? 'border-primary ring-2 ring-primary/40' : 'border-gray-200'
                }`}
              >
                <div
                  className="rounded-lg border border-gray-100 mb-2 h-12 flex items-center gap-1.5 px-2"
                  style={{ backgroundColor: p.background }}
                >
                  <span className="w-5 h-5 rounded-full border border-black/5" style={{ backgroundColor: p.primary }} />
                  <span className="w-5 h-5 rounded-full border border-black/5" style={{ backgroundColor: p.secondary }} />
                  <span className="ml-auto text-xs font-bold" style={{ color: p.text }}>가나다</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                  {active && <span className="text-[10px] text-primary font-semibold flex-shrink-0">● 적용됨</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 설정 패널 */}
        <div className="space-y-6">
          {/* 색상 설정 */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
              <Palette className="w-5 h-5" />
              색상
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'primary_color' as const, label: '주요 색상' },
                { key: 'secondary_color' as const, label: '보조 색상' },
                { key: 'background_color' as const, label: '배경 색상' },
                { key: 'text_color' as const, label: '텍스트 색상' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="block text-xs text-gray-500 mb-1">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme[item.key]}
                      onChange={(e) => updateField(item.key, e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={theme[item.key]}
                      onChange={(e) => updateField(item.key, e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 폰트 설정 */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
              <Type className="w-5 h-5" />
              폰트
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">제목 폰트</label>
                <select
                  value={theme.heading_font}
                  onChange={(e) => updateField('heading_font', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {fontOptions.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">본문 폰트</label>
                <select
                  value={theme.body_font}
                  onChange={(e) => updateField('body_font', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {fontOptions.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 헤더 스타일 */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
              <Layout className="w-5 h-5" />
              헤더 스타일
            </h2>
            <div className="space-y-2">
              {headerStyles.map((style) => (
                <label
                  key={style.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    theme.header_style === style.value
                      ? 'border-primary bg-green-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="header_style"
                    value={style.value}
                    checked={theme.header_style === style.value}
                    onChange={(e) => updateField('header_style', e.target.value)}
                    className="text-primary"
                  />
                  <div>
                    <span className="font-medium text-sm text-gray-800">{style.label}</span>
                    <p className="text-xs text-gray-500">{style.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 미리보기 */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-5 sticky top-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">미리보기</h2>

            {/* 미니 헤더 프리뷰 */}
            <div
              className="rounded-lg overflow-hidden border mb-4"
              style={{ backgroundColor: theme.background_color }}
            >
              <div className="px-4 py-3 border-b" style={{ backgroundColor: theme.primary_color }}>
                <span className="text-white font-bold text-sm">자람동산어린이집</span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.text_color }}>
                  제목 텍스트 미리보기
                </h3>
                <p className="text-sm" style={{ color: theme.text_color, opacity: 0.7 }}>
                  본문 텍스트가 이렇게 표시됩니다. 자람동산어린이집의 따뜻한 교육 환경을 소개합니다.
                </p>
              </div>
            </div>

            {/* 버튼 프리뷰 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">버튼</h4>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  주요 버튼
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                  style={{ backgroundColor: theme.secondary_color }}
                >
                  보조 버튼
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium border-2"
                  style={{ borderColor: theme.primary_color, color: theme.primary_color }}
                >
                  아웃라인
                </button>
              </div>
            </div>

            {/* 카드 프리뷰 */}
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-600">카드</h4>
              <div className="rounded-lg border overflow-hidden">
                <div className="h-24" style={{ backgroundColor: theme.secondary_color, opacity: 0.2 }} />
                <div className="p-3">
                  <h4 className="font-bold text-sm" style={{ color: theme.text_color }}>카드 제목</h4>
                  <p className="text-xs mt-1" style={{ color: theme.text_color, opacity: 0.6 }}>
                    카드 설명 텍스트입니다.
                  </p>
                  <span
                    className="inline-block mt-2 text-xs font-medium"
                    style={{ color: theme.primary_color }}
                  >
                    자세히 보기 →
                  </span>
                </div>
              </div>
            </div>

            {/* 색상 스와치 */}
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-600">색상 팔레트</h4>
              <div className="flex gap-2">
                {[
                  { color: theme.primary_color, label: '주요' },
                  { color: theme.secondary_color, label: '보조' },
                  { color: theme.background_color, label: '배경' },
                  { color: theme.text_color, label: '텍스트' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg border shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-500 mt-1 block">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
