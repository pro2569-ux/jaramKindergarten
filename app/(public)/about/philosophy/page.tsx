import { createClient } from '@/lib/supabase/server'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '교육이념 및 원훈',
}

export default async function PhilosophyPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'philosophy')
    .eq('is_published', true)
    .single()

  // 페이지가 없으면 기본 콘텐츠 표시
  const pageTitle = page?.title || '교육이념 및 원훈'
  const pageContent = page?.content || `
    <div class="flex justify-center">
      <img
        src="/images/bbb.jpg"
        alt="교육이념 및 원훈"
        class="w-full max-w-4xl rounded-lg shadow-xl"
      />
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
