'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Save, Palette } from 'lucide-react'
import { revalidateTheme } from './actions'

// ── 상수 ──────────────────────────────────────────────────────
const HEX_RE = /^#[0-9a-fA-F]{6}$/

const FONT_OPTIONS = [
  { value: 'pretendard', label: 'Pretendard (기본, 로드됨)' },
  { value: 'nanum',      label: '나눔고딕 (시스템)' },
  { value: 'notoserif',  label: 'Noto Serif KR (시스템)' },
]

const HEADER_STYLES = [
  { value: 'default',  label: '기본 (default)' },
  { value: 'centered', label: '가운데 정렬 (centered)' },
  { value: 'minimal',  label: '미니멀 (minimal)' },
]

const FONT_CSS: Record<string, string> = {
  pretendard: "'Pretendard', sans-serif",
  nanum:      "'Nanum Gothic', sans-serif",
  notoserif:  "'Noto Serif KR', serif",
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

// ── 색상 필드 컴포넌트 ─────────────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: boolean
}) {
  // 색상 피커에는 유효한 6자리 hex만 넘긴다
  const pickerValue = HEX_RE.test(value) ? value : '#000000'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 p-0.5"
          title={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className={`w-32 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
        />
        {/* 색상 미리보기 점 */}
        <span
          className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: HEX_RE.test(value) ? value : 'transparent' }}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">#rrggbb 형식의 6자리 hex를 입력하세요.</p>
      )}
    </div>
  )
}

// ── 미리보기 컴포넌트 ──────────────────────────────────────────
function ThemePreview({
  primary, secondary, background, text, headingFont, bodyFont, headerStyle,
}: {
  primary: string; secondary: string; background: string; text: string
  headingFont: string; bodyFont: string; headerStyle: string
}) {
  const safeColor = (c: string) => (HEX_RE.test(c) ? c : '#cccccc')

  const headerLabel: Record<string, string> = {
    default: '기본 헤더',
    centered: '가운데 정렬 헤더',
    minimal: '미니멀 헤더',
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* 미리보기 헤더 바 */}
      <div
        className="px-6 py-3 flex items-center gap-3"
        style={{ backgroundColor: safeColor(primary) }}
      >
        <span className="text-white font-bold text-sm" style={{ fontFamily: FONT_CSS[headingFont] }}>
          자람동산어린이집
        </span>
        <span className="ml-auto text-white/70 text-xs">{headerLabel[headerStyle] ?? headerStyle}</span>
      </div>

      {/* 본문 영역 */}
      <div
        className="p-6 space-y-4"
        style={{ backgroundColor: safeColor(background), color: safeColor(text) }}
      >
        <h2
          className="text-xl font-bold"
          style={{ color: safeColor(primary), fontFamily: FONT_CSS[headingFont] }}
        >
          원장 인사말
        </h2>
        <p className="text-sm leading-relaxed" style={{ fontFamily: FONT_CSS[bodyFont] }}>
          자람동산은 지혜가 자라고 꿈이 자라는 아이들의 동산입니다. 본문 텍스트 샘플입니다.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: safeColor(primary), fontFamily: FONT_CSS[bodyFont] }}
          >
            주요 버튼
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: safeColor(secondary), fontFamily: FONT_CSS[bodyFont] }}
          >
            보조 버튼
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{
              borderColor: safeColor(primary), color: safeColor(primary),
              backgroundColor: 'transparent', fontFamily: FONT_CSS[bodyFont],
            }}
          >
            아웃라인 버튼
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────
interface ThemeRow {
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

const DEFAULTS: Omit<ThemeRow, 'id' | 'is_active'> = {
  name:             '기본 테마',
  primary_color:    '#4f46e5',
  secondary_color:  '#f59e0b',
  background_color: '#ffffff',
  text_color:       '#1e293b',
  heading_font:     'pretendard',
  body_font:        'pretendard',
  header_style:     'default',
}

export default function AdminThemePage() {
  const router = useRouter()
  const [themeId, setThemeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(DEFAULTS)

  // 개별 필드 hex 오류 표시
  const [hexErrors, setHexErrors] = useState({
    primary_color: false,
    secondary_color: false,
    background_color: false,
    text_color: false,
  })

  useEffect(() => { loadTheme() }, [])

  const loadTheme = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('site_theme')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error) throw error
      if (!data) throw new Error('활성 테마가 없습니다.')

      const row = data as ThemeRow
      setThemeId(row.id)
      setForm({
        name:             row.name             || DEFAULTS.name,
        primary_color:    row.primary_color    || DEFAULTS.primary_color,
        secondary_color:  row.secondary_color  || DEFAULTS.secondary_color,
        background_color: row.background_color || DEFAULTS.background_color,
        text_color:       row.text_color       || DEFAULTS.text_color,
        heading_font:     row.heading_font     || DEFAULTS.heading_font,
        body_font:        row.body_font        || DEFAULTS.body_font,
        header_style:     row.header_style     || DEFAULTS.header_style,
      })
    } catch (err: any) {
      alert('테마 정보를 불러오는데 실패했습니다: ' + (err.message || ''))
      console.error(err)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof typeof DEFAULTS>(key: K, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    // hex 필드면 실시간 오류 해제
    if (key in hexErrors) {
      setHexErrors((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // hex 유효성 검사
    const colorKeys = ['primary_color', 'secondary_color', 'background_color', 'text_color'] as const
    const newErrors = {
      primary_color:    !HEX_RE.test(form.primary_color),
      secondary_color:  !HEX_RE.test(form.secondary_color),
      background_color: !HEX_RE.test(form.background_color),
      text_color:       !HEX_RE.test(form.text_color),
    }
    setHexErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) {
      alert('올바른 hex 색상값(#rrggbb)을 모두 입력해주세요.')
      return
    }

    if (!themeId) { alert('테마 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.'); return }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      // is_active는 건드리지 않음 — idx_site_theme_single_active 인덱스 충돌 방지
      const { error } = await supabase
        .from('site_theme')
        .update({
          name:             form.name.trim() || DEFAULTS.name,
          primary_color:    form.primary_color,
          secondary_color:  form.secondary_color,
          background_color: form.background_color,
          text_color:       form.text_color,
          heading_font:     form.heading_font,
          body_font:        form.body_font,
          header_style:     form.header_style,
        })
        .eq('id', themeId)   // ID로 직접 타게팅 — is_active 변경 없음

      if (error) throw error
      // 전역 테마 캐시 무효화 → 변경한 색이 사이트에 즉시 반영
      await revalidateTheme()
      alert('테마가 저장되었습니다.')
    } catch (err: any) {
      alert('저장 중 오류가 발생했습니다: ' + (err.message || ''))
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Palette className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">테마 관리</h1>
          <p className="mt-1 text-gray-600">사이트 색상, 폰트, 헤더 스타일을 관리합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 카드 1: 테마 이름 */}
        <Card>
          <CardHeader><CardTitle>테마 정보</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <Input
                label="테마 이름"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="기본 테마"
              />
            </div>
          </CardContent>
        </Card>

        {/* 카드 2: 색상 설정 */}
        <Card>
          <CardHeader><CardTitle>색상 설정</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <ColorField
                label="Primary 색상 (주요 버튼, 헤더, 강조)"
                value={form.primary_color}
                onChange={(v) => setField('primary_color', v)}
                error={hexErrors.primary_color}
              />
              <ColorField
                label="Secondary 색상 (보조 강조)"
                value={form.secondary_color}
                onChange={(v) => setField('secondary_color', v)}
                error={hexErrors.secondary_color}
              />
              <ColorField
                label="배경 색상"
                value={form.background_color}
                onChange={(v) => setField('background_color', v)}
                error={hexErrors.background_color}
              />
              <ColorField
                label="텍스트 색상"
                value={form.text_color}
                onChange={(v) => setField('text_color', v)}
                error={hexErrors.text_color}
              />
            </div>
          </CardContent>
        </Card>

        {/* 카드 3: 폰트 설정 */}
        <Card>
          <CardHeader><CardTitle>폰트 설정</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 폰트</label>
                <select
                  className={SELECT}
                  value={form.heading_font}
                  onChange={(e) => setField('heading_font', e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">본문 폰트</label>
                <select
                  className={SELECT}
                  value={form.body_font}
                  onChange={(e) => setField('body_font', e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              * Pretendard만 현재 로드되어 있습니다. 나눔고딕·Noto Serif KR 적용 시 별도 font-face 설정이 필요합니다.
            </p>
          </CardContent>
        </Card>

        {/* 카드 4: 헤더 스타일 */}
        <Card>
          <CardHeader><CardTitle>헤더 스타일</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">스타일 선택</label>
              <select
                className={SELECT}
                value={form.header_style}
                onChange={(e) => setField('header_style', e.target.value)}
              >
                {HEADER_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 카드 5: 실시간 미리보기 */}
        <Card>
          <CardHeader><CardTitle>미리보기</CardTitle></CardHeader>
          <CardContent>
            <ThemePreview
              primary={form.primary_color}
              secondary={form.secondary_color}
              background={form.background_color}
              text={form.text_color}
              headingFont={form.heading_font}
              bodyFont={form.body_font}
              headerStyle={form.header_style}
            />
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2" disabled={isSubmitting}>
            <Save className="w-5 h-5" />
            {isSubmitting ? '저장 중...' : '테마 저장'}
          </Button>
        </div>

      </form>
    </div>
  )
}
