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

  if (!page) {
    notFound()
  }

  return (
    <SubPageLayout title={menuData.about.title} menuItems={menuData.about.items}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h2>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    </SubPageLayout>
  )
}
