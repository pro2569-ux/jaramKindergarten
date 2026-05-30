'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, Edit, Trash2, User } from 'lucide-react'

interface Teacher {
  id: string
  name: string
  position: string
  class_name: string | null
  photo_url: string | null
  is_active: boolean
  sort_order: number
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setTeachers(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 교직원을 삭제하시겠습니까?`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('teachers').delete().eq('id', id)

      if (error) throw error

      alert('교직원이 삭제되었습니다.')
      loadTeachers()
    } catch (error: any) {
      alert('교직원 삭제 중 오류가 발생했습니다: ' + (error.message || ''))
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

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">교직원 관리</h1>
          <p className="mt-2 text-gray-600">교직원 정보를 관리합니다</p>
        </div>
        <Link href="/admin/teachers/create">
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            교직원 추가
          </Button>
        </Link>
      </div>

      {/* 교직원 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length > 0 ? (
          teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* 사진 */}
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden relative">
                    {teacher.photo_url ? (
                      <Image
                        src={teacher.photo_url}
                        alt={teacher.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {teacher.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {teacher.position}
                    </p>
                    {teacher.class_name && (
                      <p className="text-sm text-gray-500">
                        {teacher.class_name} 담당
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          teacher.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {teacher.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 mt-4">
                  <Link href={`/admin/teachers/${teacher.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Edit className="w-4 h-4" />
                      수정
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(teacher.id, teacher.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-3">
            <CardContent className="p-12 text-center text-gray-500">
              등록된 교직원이 없습니다
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
