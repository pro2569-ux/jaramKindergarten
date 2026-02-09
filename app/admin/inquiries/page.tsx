import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

export const metadata = {
  title: '문의 관리',
}

interface SearchParams {
  status?: string
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const status = params.status

  const supabase = await createClient()

  // 문의 목록 가져오기
  let query = supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: inquiries } = await query

  // 통계
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: repliedCount },
  ] = await Promise.all([
    supabase.from('inquiries').select('*', { count: 'exact', head: true }),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'replied'),
  ])

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">문의 관리</h1>
        <p className="mt-2 text-gray-600">접수된 문의를 확인하고 답변합니다</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/inquiries">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">전체 문의</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/inquiries?status=pending">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">대기중</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {pendingCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/inquiries?status=replied">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">답변완료</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {repliedCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 문의 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {inquiries && inquiries.length > 0 ? (
              inquiries.map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={`/admin/inquiries/${inquiry.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            inquiry.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : inquiry.status === 'replied'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {inquiry.status === 'pending'
                            ? '대기중'
                            : inquiry.status === 'replied'
                            ? '답변완료'
                            : '종료'}
                        </span>
                        {inquiry.is_private && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                            비공개
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {inquiry.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{inquiry.author_name}</span>
                        <span>•</span>
                        <span>{inquiry.author_email}</span>
                        <span>•</span>
                        <span>{formatDate(inquiry.created_at)}</span>
                      </div>
                    </div>
                    <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                문의가 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
