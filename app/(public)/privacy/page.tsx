import type { Metadata } from 'next'
import { getPublishedPageBySlug } from '@/lib/public-data'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'

export const metadata: Metadata = {
  title: '개인정보처리방침',
}

export const revalidate = 300 // lib/public-data PUBLIC_REVALIDATE 와 같은 값 (세그먼트 설정은 리터럴만 허용)

/**
 * 개인정보처리방침 — CMS pages(slug=privacy) 본문을 보여 준다 (관리자 > 페이지에서 수정).
 * 아직 페이지가 없으면 준비 중 안내.
 */
export default async function PrivacyPage() {
  const page = await getPublishedPageBySlug('privacy')

  return (
    <PageShell title="개인정보처리방침" width="reading">
      {page?.content ? (
        <div className="content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
      ) : (
        <EmptyState icon={FileText} title="개인정보처리방침을 준비 중입니다." description="곧 게시하겠습니다." />
      )}
    </PageShell>
  )
}
