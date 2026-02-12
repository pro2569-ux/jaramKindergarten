'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

interface Inquiry {
  id: string
  author_name: string
  author_email: string | null
  author_phone: string | null
  title: string
  content: string
  reply: string | null
  replied_at: string | null
  is_private: boolean
  status: 'pending' | 'replied' | 'closed'
  created_at: string
}

export default function InquiryDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [inquiryId, setInquiryId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [reply, setReply] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setInquiryId(id)
      loadInquiry(id)
    })
  }, [])

  const loadInquiry = async (id: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setInquiry(data)
        setReply(data.reply || '')
      }
    } catch (error) {
      alert('문의를 불러오는데 실패했습니다.')
      console.error(error)
      router.push('/admin/inquiries')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!reply.trim()) {
      alert('답변 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('inquiries')
        .update({
          reply,
          replied_at: new Date().toISOString(),
          status: 'replied',
        })
        .eq('id', inquiryId)

      if (error) throw error

      alert('답변이 등록되었습니다.')
      loadInquiry(inquiryId)
    } catch (error: any) {
      alert('답변 등록 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('inquiries')
        .update({ status: newStatus })
        .eq('id', inquiryId)

      if (error) throw error

      alert('상태가 변경되었습니다.')
      loadInquiry(inquiryId)
    } catch (error: any) {
      alert('상태 변경 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  if (!inquiry) return null

  const statusLabel = {
    pending: '대기중',
    replied: '답변완료',
    closed: '종료',
  }

  const statusColor = {
    pending: 'bg-orange-100 text-orange-700',
    replied: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">문의 상세</h1>
          <p className="mt-2 text-gray-600">문의 내용을 확인하고 답변합니다</p>
        </div>
        <Link href="/admin/inquiries">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로
          </Button>
        </Link>
      </div>

      {/* 문의 내용 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{inquiry.title}</CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded ${statusColor[inquiry.status]}`}
              >
                {statusLabel[inquiry.status]}
              </span>
              {inquiry.is_private && (
                <span className="px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-700 rounded">
                  비공개
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 작성자 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 mb-1">작성자</p>
              <p className="font-medium text-gray-900">{inquiry.author_name}</p>
            </div>
            {inquiry.author_email && (
              <div>
                <p className="text-xs text-gray-500 mb-1">이메일</p>
                <p className="font-medium text-gray-900">{inquiry.author_email}</p>
              </div>
            )}
            {inquiry.author_phone && (
              <div>
                <p className="text-xs text-gray-500 mb-1">연락처</p>
                <p className="font-medium text-gray-900">{inquiry.author_phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">작성일</p>
              <p className="font-medium text-gray-900">{formatDate(inquiry.created_at)}</p>
            </div>
          </div>

          {/* 문의 본문 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-gray-800 whitespace-pre-wrap">{inquiry.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* 답변 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>답변</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inquiry.reply && inquiry.replied_at && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-700">
                  기존 답변
                </span>
                <span className="text-xs text-green-600">
                  {formatDate(inquiry.replied_at)}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{inquiry.reply}</p>
            </div>
          )}

          <Textarea
            label="답변 내용"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="답변을 입력하세요"
            rows={6}
          />

          <div className="flex items-center justify-between pt-2">
            {/* 상태 변경 */}
            <div className="flex gap-2">
              {inquiry.status !== 'pending' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('pending')}
                >
                  대기중으로 변경
                </Button>
              )}
              {inquiry.status !== 'closed' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('closed')}
                >
                  종료
                </Button>
              )}
            </div>

            {/* 답변 등록 */}
            <Button
              onClick={handleReply}
              disabled={isSubmitting}
              className="gap-2"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? '등록 중...' : '답변 등록'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
