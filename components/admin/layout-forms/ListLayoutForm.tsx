'use client'

import type { ListLayoutConfig } from '@/lib/page-types'

interface Props {
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const SELECT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

export default function ListLayoutForm({ value, onChange }: Props) {
  const config = value as ListLayoutConfig
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        게시글은 posts 테이블에서 자동으로 불러옵니다. 아래에서 표시 옵션을 설정하세요.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>게시판 종류</label>
          <select
            className={SELECT}
            value={config.boardType ?? 'notice'}
            onChange={(e) => set('boardType', e.target.value)}
          >
            <option value="notice">공지사항 (notice)</option>
            <option value="newsletter">가정통신문 (newsletter)</option>
            <option value="free">자유게시판 (free)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>열 수</label>
          <select
            className={SELECT}
            value={config.columns ?? 1}
            onChange={(e) => set('columns', Number(e.target.value))}
          >
            <option value={1}>1열</option>
            <option value={2}>2열</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>페이지당 항목 수</label>
          <select
            className={SELECT}
            value={config.pageSize ?? 10}
            onChange={(e) => set('pageSize', Number(e.target.value))}
          >
            <option value={10}>10개</option>
            <option value={15}>15개</option>
            <option value={20}>20개</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showThumbnail ?? false}
              onChange={(e) => set('showThumbnail', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            썸네일 표시
          </label>
        </div>
      </div>
    </div>
  )
}
