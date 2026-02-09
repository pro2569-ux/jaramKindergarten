import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import {
  FileText,
  Image as ImageIcon,
  MessageSquare,
  TrendingUp,
  Eye,
  ArrowRight,
} from 'lucide-react'

export const metadata = {
  title: '관리자 대시보드',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // 통계 데이터 가져오기
  const [
    { count: postsCount },
    { count: albumsCount },
    { count: inquiriesCount },
    { count: pendingInquiriesCount },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('albums').select('*', { count: 'exact', head: true }),
    supabase.from('inquiries').select('*', { count: 'exact', head: true }),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  // 최근 게시글
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // 최근 문의
  const { data: recentInquiries } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      name: '전체 게시글',
      value: postsCount || 0,
      icon: FileText,
      color: 'bg-blue-500',
      href: '/admin/posts',
    },
    {
      name: '전체 앨범',
      value: albumsCount || 0,
      icon: ImageIcon,
      color: 'bg-green-500',
      href: '/admin/albums',
    },
    {
      name: '전체 문의',
      value: inquiriesCount || 0,
      icon: MessageSquare,
      color: 'bg-purple-500',
      href: '/admin/inquiries',
    },
    {
      name: '대기중 문의',
      value: pendingInquiriesCount || 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      href: '/admin/inquiries?status=pending',
    },
  ]

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-gray-600">
          자람동산어린이집 관리자 대시보드입니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.name}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`${stat.color} p-3 rounded-lg bg-opacity-10`}
                    >
                      <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 게시글 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 게시글</CardTitle>
              <Link
                href="/admin/posts"
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                전체보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts && recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/admin/posts/${post.id}/edit`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {post.board_type === 'notice'
                              ? '공지사항'
                              : '가정통신문'}
                          </span>
                          <span>{formatRelativeTime(post.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Eye className="w-4 h-4" />
                        {post.view_count}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  등록된 게시글이 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 문의 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 문의</CardTitle>
              <Link
                href="/admin/inquiries"
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                전체보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInquiries && recentInquiries.length > 0 ? (
                recentInquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {inquiry.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{inquiry.author_name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(inquiry.created_at)}</span>
                        </div>
                      </div>
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
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  등록된 문의가 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
