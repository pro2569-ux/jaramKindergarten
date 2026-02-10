import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '자연주의 유아교육 프로그램',
}

export default async function NaturePage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'nature')
    .eq('is_published', true)
    .single()

  if (!page) {
    notFound()
  }

  return (
    <SubPageLayout title={menuData.curriculum.title} menuItems={menuData.curriculum.items}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {page.title}
      </h2>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    </SubPageLayout>
  )
}
