'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageUrl = (page: number) => {
    return `${baseUrl}?page=${page}`
  }

  const pages: (number | string)[] = []
  const showEllipsis = totalPages > 7

  if (!showEllipsis) {
    // 7페이지 이하면 모두 표시
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // 7페이지 초과시 생략 표시
    if (currentPage <= 3) {
      // 현재 페이지가 앞쪽
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // 현재 페이지가 뒤쪽
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      // 현재 페이지가 중간
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
  }

  return (
    <nav className="flex items-center justify-center gap-2">
      {/* 이전 버튼 */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <button
          disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* 페이지 번호 */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-gray-400"
            >
              ...
            </span>
          )
        }

        const pageNumber = page as number
        const isActive = pageNumber === currentPage

        return (
          <Link
            key={pageNumber}
            href={getPageUrl(pageNumber)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
              isActive
                ? 'border-primary bg-primary text-white font-semibold'
                : 'border-gray-300 hover:bg-gray-50'
            )}
          >
            {pageNumber}
          </Link>
        )
      })}

      {/* 다음 버튼 */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <button
          disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  )
}
