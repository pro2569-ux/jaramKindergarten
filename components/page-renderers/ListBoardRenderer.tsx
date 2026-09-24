'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RendererProps } from './types'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

interface Post {
  id: string
  title: string
  created_at: string
  view_count: number
  is_pinned: boolean
  attachment_urls: string[] | null
}

/**
 * 리스트 게시판 렌더러 (CMS 페이지 page_type=list).
 * layout_config:
 *  - boardType   posts.board_type (기본: page.slug)
 *  - legacyOnly  true 면 이관 글(legacy_source_url 있음)만 — 교육자료실처럼 같은 board_type 의 새 글과 분리할 때
 *  - detailBase  상세 링크 기준 경로 (기본 /board/{boardType})
 *  - pageSize    페이지당 글 수 (기본 15)
 */
export default function ListBoardRenderer({ page, layoutConfig }: RendererProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const boardType = typeof layoutConfig.boardType === 'string' ? layoutConfig.boardType : page.slug
  const legacyOnly = layoutConfig.legacyOnly === true
  const detailBase = typeof layoutConfig.detailBase === 'string' ? layoutConfig.detailBase : `/board/${boardType}`
  const pageSize = Number(layoutConfig.pageSize) || 15
  const supabase = createClient()

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      let query = supabase
        .from('posts')
        .select('id, title, created_at, view_count, is_pinned, attachment_urls')
        .eq('board_type', boardType)
        .eq('is_published', true)
      if (legacyOnly) query = query.not('legacy_source_url', 'is', null)
      const { data } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, boardType, legacyOnly, pageSize])

  if (loading) {
    return <div className="py-8 text-center text-muted">불러오는 중...</div>
  }

  if (posts.length === 0 && currentPage === 1) {
    return (
      <EmptyState
        icon={FileText}
        title={`아직 공개된 ${page.title} 글이 없어요`}
        description="글이 공개되면 이곳에 보여드릴게요."
      />
    )
  }

  return (
    <div>
      {/* 헤더 (PC) */}
      <div className="hidden gap-4 border-y border-border bg-page px-4 py-3 text-sm font-semibold text-body md:grid md:grid-cols-[1fr_120px_72px]">
        <span>제목</span>
        <span className="text-center">작성일</span>
        <span className="text-center">조회</span>
      </div>
      <ul className="divide-y divide-border border-b border-border md:border-t-0">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`${detailBase}/${post.id}`}
              className="block px-4 py-3 transition-colors hover:bg-tint md:grid md:grid-cols-[1fr_120px_72px] md:items-center md:gap-4"
            >
              <span className="flex items-center gap-2 text-body">
                {post.is_pinned && <Badge>공지</Badge>}
                <span className="line-clamp-2 md:line-clamp-1">{post.title}</span>
                {post.attachment_urls && post.attachment_urls.length > 0 && (
                  <Paperclip className="h-4 w-4 shrink-0 text-disabled" aria-label="첨부파일 있음" />
                )}
              </span>
              <span className="mt-1 flex gap-3 text-xs text-muted md:mt-0 md:block md:text-center md:text-sm">
                <span className="whitespace-nowrap">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                <span className="md:hidden">조회 {post.view_count}</span>
              </span>
              <span className="hidden text-center text-sm text-muted md:block">{post.view_count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded-control border border-border px-3 py-1.5 text-sm text-body hover:bg-tint disabled:opacity-30"
        >
          이전
        </button>
        <span className="px-3 py-1.5 text-sm text-muted" aria-current="page">
          {currentPage}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={posts.length < pageSize}
          className="rounded-control border border-border px-3 py-1.5 text-sm text-body hover:bg-tint disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </div>
  )
}
