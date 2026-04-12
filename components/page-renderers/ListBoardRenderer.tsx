'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RendererProps } from './types'

interface Post {
  id: string
  title: string
  created_at: string
  view_count: number
  is_pinned: boolean
}

export default function ListBoardRenderer({ page, layoutConfig }: RendererProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = layoutConfig.pageSize || 10
  const supabase = createClient()

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at, view_count, is_pinned')
        .eq('board_type', page.slug)
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
  }, [currentPage, page.slug, pageSize])

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{page.title}</h1>
      <div className="border-t-2 border-gray-800">
        <div className="grid grid-cols-[1fr_120px_80px] gap-4 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-600 border-b">
          <span>제목</span>
          <span className="text-center">작성일</span>
          <span className="text-center">조회</span>
        </div>
        {posts.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400">게시글이 없습니다.</div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/board/${page.slug}/${post.id}`}
              className="grid grid-cols-[1fr_120px_80px] gap-4 px-4 py-3 border-b hover:bg-green-50 transition-colors"
            >
              <span className="text-gray-800">
                {post.is_pinned && <span className="text-primary font-bold mr-2">[공지]</span>}
                {post.title}
              </span>
              <span className="text-center text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString('ko-KR')}
              </span>
              <span className="text-center text-sm text-gray-500">{post.view_count}</span>
            </Link>
          ))
        )}
      </div>
      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded text-sm disabled:opacity-30"
        >
          이전
        </button>
        <span className="px-3 py-1 text-sm">{currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={posts.length < pageSize}
          className="px-3 py-1 border rounded text-sm disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </div>
  )
}
