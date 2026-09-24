import { getPostsPage } from '@/lib/public-data'
import Link from 'next/link'
import { PAGINATION } from '@/lib/constants'
import Pagination from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { Pin, Eye, Bell } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import ContentCard from '@/components/ui/ContentCard'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { getSectionNav } from '@/lib/site-nav'

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

  // 사이드바 메뉴와 글 목록(개수 포함, 쿼리 1번)을 병렬로 — 둘 다 태그 캐시 (?page= 때문에 라우트는 동적)
  const [nav, { posts, count }] = await Promise.all([getSectionNav('community'), getPostsPage('notice', currentPage, pageSize, 'all')])
  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <PageShell
      eyebrow={nav.label}
      title="공지사항"
      subtitle="자람동산어린이집의 새로운 소식을 전해드립니다"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      card={false}
    >
      {/* 게시글 목록 */}
      <ContentCard className="overflow-hidden p-0 md:p-0">
        {/* 헤더 */}
        <div className="hidden gap-4 border-b border-border bg-page px-6 py-3 text-sm font-semibold text-body md:grid md:grid-cols-12">
          <div className="col-span-1 text-center">번호</div>
          <div className="col-span-7">제목</div>
          <div className="col-span-2 text-center">작성일</div>
          <div className="col-span-2 text-center">조회수</div>
        </div>

        <div className="divide-y divide-border">
          {posts && posts.length > 0 ? (
            posts.map((post, index) => (
              <Link
                key={post.id}
                href={`/board/notice/${post.id}`}
                className="block px-4 py-4 transition-colors hover:bg-tint md:px-6"
              >
                <div className="grid items-center gap-2 md:grid-cols-12 md:gap-4">
                  {/* 번호 */}
                  <div className="hidden text-center text-sm text-muted md:col-span-1 md:block">
                    {post.is_pinned ? (
                      <Pin className="mx-auto h-4 w-4 text-primary-ink" aria-label="고정" />
                    ) : (
                      count! - (currentPage - 1) * pageSize - index
                    )}
                  </div>

                  {/* 제목 */}
                  <div className="col-span-12 md:col-span-7">
                    <div className="flex items-center gap-2">
                      {post.is_pinned && <Badge>공지</Badge>}
                      <span className="line-clamp-1 font-medium text-heading">{post.title}</span>
                    </div>
                  </div>

                  {/* 작성일·조회수 (모바일) */}
                  <div className="flex items-center gap-4 text-sm text-muted md:hidden">
                    <span>{formatDate(post.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {post.view_count}
                    </span>
                  </div>

                  {/* 작성일 (데스크톱) */}
                  <div className="hidden text-center text-sm text-muted md:col-span-2 md:block">
                    {formatDate(post.created_at)}
                  </div>

                  {/* 조회수 (데스크톱) */}
                  <div className="hidden text-center text-sm text-muted md:col-span-2 md:block">
                    {post.view_count}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState icon={Bell} title="등록된 공지사항이 없습니다." description="새 소식이 올라오면 이곳에 표시됩니다." />
          )}
        </div>
      </ContentCard>

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
    </PageShell>
  )
}
