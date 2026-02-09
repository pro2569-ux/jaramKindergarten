import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, Edit, Trash2, User } from 'lucide-react'

export const metadata = {
  title: '교직원 관리',
}

export default async function AdminTeachersPage() {
  const supabase = await createClient()

  // 교직원 목록 가져오기
  const { data: teachers } = await supabase
    .from('teachers')
    .select('*')
    .order('sort_order')

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
        {teachers && teachers.length > 0 ? (
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
