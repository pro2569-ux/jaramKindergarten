import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '원장 인사말',
}

export default async function GreetingPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'greeting')
    .eq('is_published', true)
    .single()

  // 페이지가 없으면 기본 콘텐츠 표시
  const pageTitle = page?.title || '원장 인사말'
  const pageContent = page?.content || `
    <div class="text-center py-12">
      <p class="text-gray-500 mb-4">아직 작성된 내용이 없습니다.</p>
      <p class="text-sm text-gray-400">관리자 페이지에서 콘텐츠를 작성해주세요.</p>
    </div>
  `

  return (
    <SubPageLayout title={menuData.about.title} menuItems={menuData.about.items}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">{pageTitle}</h2>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: pageContent }}
      />
    </SubPageLayout>
  )
}
