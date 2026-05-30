import type { Page } from '@/types/database'
import type { PdfListLayoutConfig, PdfItem } from '@/lib/page-types'
import { FileText, Download, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function sortItems(items: PdfItem[], sortBy: string): PdfItem[] {
  if (sortBy === 'name') {
    return [...items].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }
  return [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

export default function PdfListRenderer({ page }: { page: Page }) {
  const config = (page.layout_config ?? {}) as PdfListLayoutConfig
  const items  = Array.isArray(config.items) ? config.items : []
  const sortBy = config.sortBy ?? 'date'
  const sorted = sortItems(items, sortBy)

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>등록된 PDF 파일이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="divide-y border border-gray-200 rounded-xl overflow-hidden">
      {sorted.map((item) => (
        <a
          key={item.id}
          href={item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
        >
          <FileText className="w-8 h-8 text-red-400 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 group-hover:text-primary truncate">
              {item.title}
            </p>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
            )}
            {item.date && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(item.date)}</span>
              </div>
            )}
          </div>

          <Download className="w-5 h-5 text-gray-400 group-hover:text-primary flex-shrink-0 transition-colors" />
        </a>
      ))}
    </div>
  )
}
