import { createClient } from '@/lib/supabase/server'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '시설현황',
}

export default async function FacilitiesPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'facilities')
    .eq('is_published', true)
    .single()

  // 페이지가 없으면 기본 콘텐츠 표시
  const pageTitle = page?.title || '시설현황'
  const pageContent = page?.content || `
    <div class="space-y-8">
      <!-- 어린이집 교육 환경 -->
      <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-l-4 border-primary">
        <h3 class="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span class="text-2xl">🌿</span>
          어린이집 교육 환경
        </h3>
        <p class="text-gray-700 leading-relaxed">
          교육자료실, 보육실, 미니도서실, 아뜰리에, 특별실, 강당, 목욕실, 모래놀이장, 아씨놀이터, 숲속놀이터,
          텃밭, 휴게실, 육상놀이터, 아씨데코.
        </p>
      </div>

      <!-- 시설현황 테이블 -->
      <div>
        <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span class="text-2xl">🌿</span>
          시설현황
        </h3>

        <div class="overflow-x-auto rounded-xl shadow-lg border border-green-100">
          <table class="w-full border-collapse bg-white">
            <!-- 테이블 헤더 -->
            <thead>
              <tr class="bg-gradient-to-r from-primary to-primary-light text-white">
                <th class="border border-green-200 px-6 py-4 text-center font-bold">구분</th>
                <th class="border border-green-200 px-6 py-4 text-center font-bold">실내</th>
                <th class="border border-green-200 px-6 py-4 text-center font-bold">옥외</th>
              </tr>
            </thead>

            <!-- 테이블 바디 -->
            <tbody>
              <!-- 옥상 -->
              <tr class="hover:bg-green-50 transition-colors">
                <td class="border border-green-200 px-6 py-4 text-center font-semibold bg-green-50">옥상</td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>강당</div>
                    <div>보육실</div>
                    <div>학습실/정서안정공실</div>
                  </div>
                </td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>극상놀이터</div>
                    <div>육상경점</div>
                  </div>
                </td>
              </tr>

              <!-- 3층 -->
              <tr class="hover:bg-green-50 transition-colors">
                <td class="border border-green-200 px-6 py-4 text-center font-semibold bg-green-50">3층</td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>강당</div>
                    <div>보육실</div>
                    <div>학습실/정서안정공실</div>
                  </div>
                </td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="text-gray-700">아씨데코</div>
                </td>
              </tr>

              <!-- 2층 -->
              <tr class="hover:bg-green-50 transition-colors">
                <td class="border border-green-200 px-6 py-4 text-center font-semibold bg-green-50">2층</td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>보육실</div>
                    <div>유희실</div>
                    <div>화장실</div>
                    <div>조리실</div>
                    <div>식품보관실</div>
                  </div>
                </td>
                <td class="border border-green-200 px-6 py-4 bg-gray-50">
                  <div class="text-gray-400 text-center">-</div>
                </td>
              </tr>

              <!-- 1층 -->
              <tr class="hover:bg-green-50 transition-colors">
                <td class="border border-green-200 px-6 py-4 text-center font-semibold bg-green-50">1층</td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>보육실</div>
                    <div>미니도서실</div>
                    <div>현관실/교무실</div>
                    <div>목욕실</div>
                    <div>세탁실</div>
                    <div>학습실/정서안정공실</div>
                  </div>
                </td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>잘익놀이터/모래놀이장</div>
                    <div>텃밭/햇살 앞 놀이터</div>
                    <div>주차장</div>
                  </div>
                </td>
              </tr>

              <!-- 지하 1층 -->
              <tr class="hover:bg-green-50 transition-colors">
                <td class="border border-green-200 px-6 py-4 text-center font-semibold bg-green-50">지하<br/>1층</td>
                <td class="border border-green-200 px-6 py-4">
                  <div class="space-y-1 text-gray-700">
                    <div>휴게실</div>
                    <div>자료실</div>
                    <div>기계실</div>
                    <div>물탱크실</div>
                  </div>
                </td>
                <td class="border border-green-200 px-6 py-4 bg-gray-50">
                  <div class="text-gray-400 text-center">-</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 장식 요소 -->
      <div class="flex justify-end items-center gap-2 text-primary opacity-20">
        <span class="text-4xl">🌿</span>
        <span class="text-3xl">🌱</span>
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
