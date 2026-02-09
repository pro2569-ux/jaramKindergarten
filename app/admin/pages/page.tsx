import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Edit, Eye } from 'lucide-react'

export const metadata = {
  title: '페이지 관리',
}

export default async function AdminPagesPage() {
  const supabase = await createClient()

  // 페이지 목록 가져오기
  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .order('category')
    .order('sort_order')

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">페이지 관리</h1>
        <p className="mt-2 text-gray-600">
          소개 및 보육과정 페이지 콘텐츠를 관리합니다
        </p>
      </div>

      {/* 페이지 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pages && pages.length > 0 ? (
          pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                        {page.category === 'about' ? '소개' : '보육과정'}
                      </span>
                      {page.is_published && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                          공개
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {page.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      /{page.category}/{page.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/${page.category}/${page.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/pages/${page.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-2">
            <CardContent className="p-12 text-center text-gray-500">
              등록된 페이지가 없습니다
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
