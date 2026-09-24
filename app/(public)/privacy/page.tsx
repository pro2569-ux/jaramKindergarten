import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'

export const metadata: Metadata = {
  title: '개인정보처리방침',
}

export const revalidate = 60

/**
 * 개인정보처리방침 — CMS pages(slug=privacy) 본문을 보여 준다 (관리자 > 페이지에서 수정).
 * 아직 페이지가 없으면 준비 중 안내.
 */
export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: page } = await supabase
    .from('pages')
    .select('title, content, updated_at')
    .eq('slug', 'privacy')
    .eq('is_published', true)
    .maybeSingle()

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
