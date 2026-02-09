import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PAGINATION } from '@/lib/constants'
import Pagination from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { Pin, Eye } from 'lucide-react'

export const metadata = {
  title: '공지사항',
}

interface SearchParams {
  page?: string
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE

  const supabase = await createClient()

  // 전체 개수 가져오기
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('board_type', 'notice')
    .eq('is_published', true)

  const totalPages = Math.ceil((count || 0) / pageSize)

  // 공지사항 목록 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('board_type', 'notice')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">공지사항</h1>
          <p className="text-gray-600">
            자람동산어린이집의 새로운 소식을 전해드립니다
          </p>
        </div>

        {/* 게시글 목록 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-sm font-semibold text-gray-700">
            <div className="col-span-1 text-center">번호</div>
            <div className="col-span-7">제목</div>
            <div className="col-span-2 text-center">작성일</div>
            <div className="col-span-2 text-center">조회수</div>
          </div>

          {/* 게시글 목록 */}
          <div className="divide-y">
            {posts && posts.length > 0 ? (
              posts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/board/notice/${post.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid md:grid-cols-12 gap-4 items-center">
                    {/* 번호 */}
                    <div className="hidden md:block col-span-1 text-center text-gray-600">
                      {post.is_pinned ? (
                        <Pin className="w-5 h-5 mx-auto text-primary" />
                      ) : (
                        count! - (currentPage - 1) * pageSize - index
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
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {post.title}
                        </span>
                      </div>
                    </div>

                    {/* 작성일 (모바일) */}
                    <div className="flex md:hidden items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(post.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.view_count}
                      </span>
                    </div>

                    {/* 작성일 (데스크톱) */}
                    <div className="hidden md:block col-span-2 text-center text-gray-600 text-sm">
                      {formatDate(post.created_at)}
                    </div>

                    {/* 조회수 (데스크톱) */}
                    <div className="hidden md:block col-span-2 text-center text-gray-600 text-sm">
                      {post.view_count}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-16 text-center text-gray-500">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/board/notice"
            />
          </div>
        )}
      </div>
    </div>
  )
}
