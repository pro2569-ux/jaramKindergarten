import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '누리과정',
}

export default async function NuriPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'nuri')
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
