import { getPublishedPost } from '@/lib/public-data'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Eye, Calendar, ArrowLeft, Download } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import { attachmentLabel } from '@/lib/attachments'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import Badge from '@/components/ui/Badge'
import ButtonLink from '@/components/ui/ButtonLink'
import { getSectionNav } from '@/lib/site-nav'

// 정적(ISR) 상세: 공개 글만 태그 캐시 로더로 읽는다 (비공개 글은 404 그대로)
export const revalidate = 300 // lib/public-data PUBLIC_REVALIDATE 와 같은 값 (세그먼트 설정은 리터럴만 허용)

// ISR: 빌드 때 미리 만들지 않고 첫 요청에서 만들어 캐시한다(revalidate·태그로 갱신).
// 동적 세그먼트는 이 export 가 없으면 매 요청 서버 렌더링(캐시 없음)이 된다.
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const post = await getPublishedPost('notice', id)
  return {
    title: post?.title || '공지사항',
  }
}

export default async function NoticeDetailPage({ params }: PageProps) {
  const { id } = await params
  const [post, nav] = await Promise.all([getPublishedPost('notice', id), getSectionNav('community')])

  if (!post) {
    notFound()
  }
  const legacyMeta = (post.legacy_meta ?? null) as Record<string, unknown> | null

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

        {/* 내용 */}
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div
            className="content"
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
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-ink hover:underline"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {attachmentLabel(url, index, legacyMeta)}
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
