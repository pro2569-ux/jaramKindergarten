'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
}

const cellBase =
  'flex h-10 min-w-10 items-center justify-center rounded-control border px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2'

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
    <nav aria-label="페이지" className="flex items-center justify-center gap-2">
      {/* 이전 버튼 */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          aria-label="이전 페이지"
          className={cn(cellBase, 'border-border bg-surface text-body hover:bg-gray-50')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(cellBase, 'cursor-not-allowed border-border text-disabled')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </span>
      )}

      {/* 페이지 번호 */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-10 w-8 items-center justify-center text-disabled"
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
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${pageNumber}페이지`}
            className={cn(
              cellBase,
              isActive
                ? 'border-primary bg-primary font-semibold text-on-primary'
                : 'border-border bg-surface text-body hover:bg-gray-50'
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
          aria-label="다음 페이지"
          className={cn(cellBase, 'border-border bg-surface text-body hover:bg-gray-50')}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(cellBase, 'cursor-not-allowed border-border text-disabled')}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  )
}
