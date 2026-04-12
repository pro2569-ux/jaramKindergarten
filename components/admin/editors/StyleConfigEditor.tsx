'use client'

interface Props {
  styleConfig: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const fontOptions = [
  { value: 'pretendard', label: 'Pretendard' },
  { value: 'nanum', label: '나눔고딕' },
  { value: 'notoserif', label: 'Noto Serif KR' },
]

const spacingOptions = [
  { value: 'compact', label: '좁게' },
  { value: 'normal', label: '보통' },
  { value: 'relaxed', label: '넓게' },
]

const headingSizeOptions = [
  { value: 'sm', label: '작게' },
  { value: 'md', label: '보통' },
  { value: 'lg', label: '크게' },
]

export default function StyleConfigEditor({ styleConfig, onChange }: Props) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...styleConfig, [key]: value })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700">스타일 설정</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">주요 색상</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={styleConfig.primaryColor || '#4f46e5'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={styleConfig.primaryColor || '#4f46e5'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border rounded text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">강조 색상</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={styleConfig.accentColor || '#f59e0b'}
              onChange={(e) => handleChange('accentColor', e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={styleConfig.accentColor || '#f59e0b'}
              onChange={(e) => handleChange('accentColor', e.target.value)}
              className="flex-1 px-3 py-2 border rounded text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">폰트</label>
          <select
            value={styleConfig.fontFamily || 'pretendard'}
            onChange={(e) => handleChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            {fontOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">제목 크기</label>
          <select
            value={styleConfig.headingSize || 'md'}
            onChange={(e) => handleChange('headingSize', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            {headingSizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">간격</label>
          <select
            value={styleConfig.spacing || 'normal'}
            onChange={(e) => handleChange('spacing', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            {spacingOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
