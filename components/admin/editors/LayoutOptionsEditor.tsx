'use client'

import { PAGE_TYPES, PageType } from '@/lib/page-types'

interface Props {
  pageType: PageType
  layoutConfig: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export default function LayoutOptionsEditor({ pageType, layoutConfig, onChange }: Props) {
  const typeInfo = PAGE_TYPES[pageType]
  if (!typeInfo) return null

  const options = typeInfo.layoutOptions as Record<string, any[]>

  const handleChange = (key: string, value: any) => {
    onChange({ ...layoutConfig, [key]: value })
  }

  const labelMap: Record<string, string> = {
    width: '콘텐츠 폭',
    showTOC: '목차 표시',
    columns: '컬럼 수',
    showThumbnail: '썸네일 표시',
    pageSize: '페이지당 글 수',
    aspectRatio: '이미지 비율',
    gap: '간격',
    sortBy: '정렬 기준',
    showPreview: '미리보기 표시',
    cardStyle: '카드 스타일',
    expandStyle: '확장 방식',
    direction: '방향',
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700">레이아웃 옵션</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(options).map(([key, values]) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">{labelMap[key] || key}</label>
            {typeof values[0] === 'boolean' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layoutConfig[key] ?? values[0]}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{layoutConfig[key] ? '사용' : '미사용'}</span>
              </label>
            ) : (
              <select
                value={layoutConfig[key] ?? values[0]}
                onChange={(e) => {
                  const val = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                  handleChange(key, val)
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {values.map((v: any) => (
                  <option key={String(v)} value={v}>{String(v)}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
