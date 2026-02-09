import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { User } from 'lucide-react'

export const metadata = {
  title: '교원 및 반편성',
}

export default async function TeachersPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            교원 및 반편성
          </h1>
          <p className="text-lg text-gray-600">
            사랑과 전문성으로 아이들을 가르치는 우리 선생님들을 소개합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teachers && teachers.length > 0 ? (
            teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 relative">
                  {teacher.photo_url ? (
                    <Image
                      src={teacher.photo_url}
                      alt={teacher.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <User className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {teacher.name}
                    </h3>
                    <span className="text-sm font-medium text-primary">
                      {teacher.position}
                    </span>
                  </div>
                  {teacher.class_name && (
                    <p className="text-sm text-gray-600 mb-3">
                      {teacher.class_name} 담당
                    </p>
                  )}
                  {teacher.introduction && (
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {teacher.introduction}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-12 text-center text-gray-500">
              등록된 교직원 정보가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
