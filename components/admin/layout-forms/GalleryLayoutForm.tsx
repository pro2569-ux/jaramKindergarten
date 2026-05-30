'use client'

import type { GalleryLayoutConfig } from '@/lib/page-types'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

export default function GalleryLayoutForm({ value, onChange }: Props) {
  const config = value as GalleryLayoutConfig
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        앨범은 albums 테이블에서 자동으로 불러옵니다. 아래에서 그리드 표시 옵션을 설정하세요.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>열 수</label>
          <select
            className={SELECT}
            value={config.columns ?? 3}
            onChange={(e) => set('columns', Number(e.target.value))}
          >
            <option value={2}>2열</option>
            <option value={3}>3열</option>
            <option value={4}>4열</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>이미지 비율</label>
          <select
            className={SELECT}
            value={config.aspectRatio ?? 'video'}
            onChange={(e) => set('aspectRatio', e.target.value)}
          >
            <option value="square">정사각형 (1:1)</option>
            <option value="video">와이드 (16:9)</option>
            <option value="auto">자동</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>간격</label>
          <select
            className={SELECT}
            value={config.gap ?? 'md'}
            onChange={(e) => set('gap', e.target.value)}
          >
            <option value="sm">좁게 (sm)</option>
            <option value="md">보통 (md)</option>
            <option value="lg">넓게 (lg)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
