'use client'

import type { SingleLayoutConfig } from '@/lib/page-types'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

export default function SingleLayoutForm({ value, onChange }: Props) {
  const config = value as SingleLayoutConfig
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">리치 텍스트 에디터 위 카드에서 콘텐츠를 작성하세요. 아래는 표시 옵션입니다.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>콘텐츠 너비</label>
          <select
            className={SELECT}
            value={config.width ?? 'wide'}
            onChange={(e) => set('width', e.target.value)}
          >
            <option value="narrow">좁게 (narrow)</option>
            <option value="medium">중간 (medium)</option>
            <option value="wide">넓게 (wide)</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showTOC ?? false}
              onChange={(e) => set('showTOC', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            목차(TOC) 표시
          </label>
        </div>
      </div>
    </div>
  )
}
