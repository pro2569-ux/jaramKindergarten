'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'

interface DeletePostButtonProps {
  postId: string
  boardType: string
}

export default function DeletePostButton({ postId, boardType }: DeletePostButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      alert('게시글이 삭제되었습니다.')
      router.refresh()
    } catch (error: any) {
      alert('게시글 삭제 중 오류가 발생했습니다: ' + (error.message || ''))
      console.error(error)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-red-600 hover:text-red-700"
      onClick={handleDelete}
    >
      <Trash2 className="w-4 h-4" />
      삭제
    </Button>
  )
}
