import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Eye, Calendar, ArrowLeft, Download } from 'lucide-react'
import Button from '@/components/ui/Button'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', id)
    .single()

  return {
    title: post?.title || '가정통신문',
  }
}

export default async function NewsletterDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 게시글 가져오기
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('board_type', 'newsletter')
    .eq('is_published', true)
    .single()

  if (!post) {
    notFound()
  }

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* 목록으로 버튼 */}
        <div className="mb-6">
          <Link href="/board/newsletter">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              목록으로
            </Button>
          </Link>
        </div>

        {/* 게시글 */}
        <article className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div className="border-b px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>조회수 {post.view_count}</span>
              </div>
            </div>
          </div>

          {/* 내용 */}
          <div className="px-8 py-8">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />
          </div>

          {/* 첨부파일 */}
          {post.attachment_urls && post.attachment_urls.length > 0 && (
            <div className="border-t px-8 py-6 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                첨부파일
              </h3>
              <div className="space-y-2">
                {post.attachment_urls.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    download
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark"
                  >
                    <Download className="w-4 h-4" />
                    첨부파일 {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* 하단 버튼 */}
        <div className="mt-6 flex justify-center">
          <Link href="/board/newsletter">
            <Button>목록으로</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
