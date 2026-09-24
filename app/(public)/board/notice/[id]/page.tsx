import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Eye, Calendar, ArrowLeft, Download } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import Badge from '@/components/ui/Badge'
import ButtonLink from '@/components/ui/ButtonLink'
import { getSectionNav } from '@/lib/site-nav'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', id)
    .single()

  return {
    title: post?.title || '공지사항',
  }
}

export default async function NoticeDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 게시글 가져오기
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('board_type', 'notice')
    .eq('is_published', true)
    .single()

  if (!post) {
    notFound()
  }

  const nav = await getSectionNav('board')

  // 조회수 증가 (실제로는 클라이언트에서 처리하는 것이 좋지만 여기서는 간단히)
  // await supabase.rpc('increment_view_count', { post_id: id })

  return (
    <PageShell
      eyebrow={nav.label}
      title="공지사항"
      titleAs="p"
      titleHref="/board/notice"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      width="reading"
      card={false}
    >
      {/* 목록으로 */}
      <div className="mb-4">
        <ButtonLink href="/board/notice" variant="ghost" size="sm" className="-ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          목록으로
        </ButtonLink>
      </div>

      {/* 게시글 */}
      <article className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        {/* 헤더: 페이지 유일의 h1 */}
        <header className="border-b border-border px-4 py-5 md:px-6 md:py-6">
          {post.is_pinned && <Badge className="mb-3">공지</Badge>}
          <h1 className="typo-h1 text-heading">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {formatDate(post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden="true" />
              조회수 {post.view_count}
            </span>
          </div>
        </header>

        {/* 내용 (본문 CSS는 PR B) */}
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content || '') }}
          />
        </div>

        {/* 첨부파일 */}
        {post.attachment_urls && post.attachment_urls.length > 0 && (
          <div className="border-t border-border bg-page px-4 py-5 md:px-6">
            <h2 className="mb-3 text-sm font-semibold text-heading">첨부파일</h2>
            <ul className="space-y-2">
              {post.attachment_urls.map((url: string, index: number) => (
                <li key={index}>
                  <a
                    href={url}
                    download
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-ink hover:underline"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    첨부파일 {index + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* 하단 버튼 */}
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/board/notice" variant="outline">
          목록으로
        </ButtonLink>
      </div>
    </PageShell>
  )
}
