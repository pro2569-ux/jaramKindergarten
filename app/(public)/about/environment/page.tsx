import { createClient } from '@/lib/supabase/server'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '교육환경',
}

export default async function EnvironmentPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'environment')
    .eq('is_published', true)
    .single()

  // 페이지가 없으면 기본 콘텐츠 표시
  const pageTitle = page?.title || '교육환경'
  const pageContent = page?.content || `
    <div class="space-y-8">
      <!-- 첫 번째 줄: 대표 이미지 -->
      <div class="w-full">
        <img
          src="/images/foreground1.png"
          alt="교육환경"
          class="w-full rounded-xl shadow-2xl"
        />
      </div>

      <!-- 두 번째 줄: 3개 이미지 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-2">
          <img
            src="/images/1-1.jpg"
            alt="원장실"
            class="w-full h-64 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">원장실</p>
        </div>
        <div class="space-y-2">
          <img
            src="/images/1-2.jpg"
            alt="교실"
            class="w-full h-64 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">교실</p>
        </div>
        <div class="space-y-2">
          <img
            src="/images/1-3.jpg"
            alt="계단"
            class="w-full h-64 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">계단</p>
        </div>
      </div>

      <!-- 세 번째 줄: 2개 이미지 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <img
            src="/images/2-1.jpg"
            alt="전실"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">전실</p>
        </div>
        <div class="space-y-2">
          <img
            src="/images/2-2.jpg"
            alt="로비"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">로비</p>
        </div>
      </div>

      <!-- 네 번째 줄: 2개 이미지 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <img
            src="/images/2-3.jpg"
            alt="아뜰리에"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">아뜰리에</p>
        </div>
        <div class="space-y-2">
          <img
            src="/images/2-4.jpg"
            alt="복도"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">복도</p>
        </div>
      </div>

      <!-- 다섯 번째 줄: 2개 이미지 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <img
            src="/images/2-5.jpg"
            alt="특별실"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">특별실</p>
        </div>
        <div class="space-y-2">
          <img
            src="/images/2-6.jpg"
            alt="강당"
            class="w-full h-80 object-cover rounded-lg shadow-lg"
          />
          <p class="text-center text-gray-700 font-medium">강당</p>
        </div>
      </div>
    </div>
  `

  return (
    <SubPageLayout title={menuData.about.title} menuItems={menuData.about.items}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {pageTitle}
      </h2>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: pageContent }}
      />
    </SubPageLayout>
  )
}
