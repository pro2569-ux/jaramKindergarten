import { getPublishedPost } from '@/lib/public-data'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Eye, Calendar, ArrowLeft, Download } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import { attachmentLabel } from '@/lib/attachments'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import ButtonLink from '@/components/ui/ButtonLink'
import { getSectionNav } from '@/lib/site-nav'

// 교육자료실 상세 (원본 jaramk.com 커뮤니티 > 교육자료실). 목록은 CMS 페이지(/community/archive, page_type=list)가 맡는다.
// 글은 posts.board_type='newsletter' 중 이관 글(legacy_source_url 있음)만 해당.
interface PageProps {
  params: Promise<{ id: string }>
}

const LIST_HREF = '/community/archive'

// 정적(ISR) 상세: 공개된 이관 글만 태그 캐시 로더로 읽는다
export const revalidate = 300 // lib/public-data PUBLIC_REVALIDATE 와 같은 값 (세그먼트 설정은 리터럴만 허용)

// ISR: 빌드 때 미리 만들지 않고 첫 요청에서 만들어 캐시한다(revalidate·태그로 갱신).
// 동적 세그먼트는 이 export 가 없으면 매 요청 서버 렌더링(캐시 없음)이 된다.
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const post = await getPublishedPost('newsletter', id, true)
  return { title: post?.title || '교육자료실' }
}

export default async function ArchiveDetailPage({ params }: PageProps) {
  const { id } = await params
  const [post, nav] = await Promise.all([getPublishedPost('newsletter', id, true), getSectionNav('community')])

  if (!post) {
    notFound()
  }
  const legacyMeta = (post.legacy_meta ?? null) as Record<string, unknown> | null

  return (
    <PageShell
      eyebrow={nav.label}
      title="교육자료실"
      titleAs="p"
      titleHref={LIST_HREF}
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      width="reading"
      card={false}
    >
      <div className="mb-4">
        <ButtonLink href={LIST_HREF} variant="ghost" size="sm" className="-ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          목록으로
        </ButtonLink>
      </div>

      <article className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <header className="border-b border-border px-4 py-5 md:px-6 md:py-6">
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

        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content || '') }} />
        </div>

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

      <div className="mt-6 flex justify-center">
        <ButtonLink href={LIST_HREF} variant="outline">
          목록으로
        </ButtonLink>
      </div>
    </PageShell>
  )
}
