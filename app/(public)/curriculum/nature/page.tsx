import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

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
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            {page.title}
          </h1>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content || '' }}
          />
        </div>
      </div>
    </div>
  )
}
