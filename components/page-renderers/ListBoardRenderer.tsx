import { createClient } from '@/lib/supabase/server'
import type { Page } from '@/types/database'
import type { ListLayoutConfig } from '@/lib/page-types'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Pin, Eye } from 'lucide-react'

export default async function ListBoardRenderer({ page }: { page: Page }) {
  const config = (page.layout_config ?? {}) as ListLayoutConfig
  const boardType = config.boardType ?? 'notice'
  const pageSize = config.pageSize ?? 10

  const supabase = await createClient()
  const { data: posts, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('board_type', boardType)
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(pageSize)

  const total = count ?? 0

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-sm font-semibold text-gray-700">
        <div className="col-span-1 text-center">번호</div>
        <div className="col-span-7">제목</div>
        <div className="col-span-2 text-center">작성일</div>
        <div className="col-span-2 text-center">조회수</div>
      </div>

      <div className="divide-y">
        {posts && posts.length > 0 ? (
          posts.map((post, index) => (
            <Link
              key={post.id}
              href={`/board/${boardType}/${post.id}`}
              className="block px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="grid md:grid-cols-12 gap-4 items-center">
                {/* 번호 */}
                <div className="hidden md:block col-span-1 text-center text-gray-600">
                  {post.is_pinned ? (
                    <Pin className="w-5 h-5 mx-auto text-primary" />
                  ) : (
                    total - index
                  )}
                </div>

                {/* 제목 */}
                <div className="col-span-12 md:col-span-7">
                  <div className="flex items-center gap-2">
                    {post.is_pinned && (
                      <span className="px-2 py-1 text-xs font-semibold bg-primary text-white rounded">
                        공지
                      </span>
                    )}
                    <span className="font-medium text-gray-900 line-clamp-1">{post.title}</span>
                  </div>
                </div>

                {/* 모바일: 날짜+조회수 한 줄 */}
                <div className="flex md:hidden items-center gap-4 text-sm text-gray-500">
                  <span>{formatDate(post.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {post.view_count}
                  </span>
                </div>

                {/* 데스크톱: 날짜 */}
                <div className="hidden md:block col-span-2 text-center text-gray-600 text-sm">
                  {formatDate(post.created_at)}
                </div>

                {/* 데스크톱: 조회수 */}
                <div className="hidden md:block col-span-2 text-center text-gray-600 text-sm">
                  {post.view_count}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-6 py-16 text-center text-gray-500">
            등록된 게시글이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
