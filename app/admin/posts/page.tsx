import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { Plus, Edit, Eye } from 'lucide-react'
import DeletePostButton from './delete-button'

export const metadata = {
  title: '게시글 관리',
}

interface SearchParams {
  type?: string
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const boardType = params.type || 'notice'

  const supabase = await createClient()

  // 게시글 목록 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('board_type', boardType)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">게시글 관리</h1>
          <p className="mt-2 text-gray-600">
            공지사항과 가정통신문을 관리합니다
          </p>
        </div>
        <Link href={`/admin/posts/create?type=${boardType}`}>
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            새 게시글
          </Button>
        </Link>
      </div>

      {/* 게시판 타입 탭 */}
      <div className="flex gap-2">
        <Link href="/admin/posts?type=notice">
          <Button
            variant={boardType === 'notice' ? 'primary' : 'outline'}
            size="sm"
          >
            공지사항
          </Button>
        </Link>
        <Link href="/admin/posts?type=newsletter">
          <Button
            variant={boardType === 'newsletter' ? 'primary' : 'outline'}
            size="sm"
          >
            가정통신문
          </Button>
        </Link>
      </div>

      {/* 게시글 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {post.is_pinned && (
                            <span className="px-2 py-1 text-xs font-semibold bg-primary text-white rounded">
                              고정
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            {post.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            post.is_published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.is_published ? '공개' : '비공개'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.view_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/posts/${post.id}/edit`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Edit className="w-4 h-4" />
                              수정
                            </Button>
                          </Link>
                          <DeletePostButton postId={post.id} boardType={boardType} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      등록된 게시글이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
