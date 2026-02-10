import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { menuData } from '@/lib/menu-items'

export const metadata = {
  title: '원장 인사말',
}

export default async function GreetingPage() {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', 'greeting')
    .eq('is_published', true)
    .single()

  // 페이지가 없으면 기본 콘텐츠 표시
  const pageTitle = page?.title || '원장 인사말'
  const pageContent = page?.content || `
    <div class="relative rounded-2xl overflow-hidden shadow-xl">
      <!-- 배경 이미지 -->
      <div class="absolute inset-0 z-0">
        <img src="/images/aaa.png" alt="배경" class="w-full h-full object-cover opacity-20" />
      </div>

      <!-- 오버레이 (텍스트 가독성 향상) -->
      <div class="absolute inset-0 z-0 bg-gradient-to-b from-white/80 via-white/90 to-white/95"></div>

      <!-- 콘텐츠 -->
      <div class="relative z-10 p-8 md:p-12 space-y-6">
        <p class="text-xl md:text-2xl font-bold text-center text-primary mb-8">
          자람동산 어린이집에 오신 것을 환영합니다.
        </p>

        <p class="text-gray-800 leading-relaxed">
          자람동산은 지혜가 자라고 꿈이 자라는 아이들의 동산입니다.<br/>
          이곳에서 함께 뛰놀며 기쁨과 감사를 노래하고<br/>
          행복한 유년 시절을 통해 자아를 실현해 가는<br/>
          교육의 장이 되기를 소망합니다.
        </p>

        <p class="text-gray-800 leading-relaxed">
          이곳에 아이들의 꿈을 키워 줄 아름다운 공간을 만들기 위해<br/>
          준비하는 모든 과정마다 내 마음속에는 아이들이 있었습니다.<br/>
          그 아이들이 자신을 사랑하고, 이웃과 자연을 사랑하며<br/>
          더 나아가 세계를 품는 아이들로 자라나기를 바랍니다.
        </p>

        <p class="text-gray-800 leading-relaxed">
          유아기는 인격이 형성되는 출발점이며 또한 결정적인 성숙기입니다.<br/>
          신체적으로나 정신적으로 부단히 성장해 가는 유아들의 교육을<br/>
          책임지고 있는 교원으로서 가장 바람직한 교육적 가치를 찾아 끊임없이<br/>
          연구하고 노력하며 자람의 아이들을 멋진 리더로 세워 가고자합니다.
        </p>

        <p class="text-gray-800 leading-relaxed">
          자람의 교육프로그램은 자연주의 유아교육 철학의 기초아래<br/>
          자람만의 차별화된 숲 유치원 활동을 통해 건강하고 슬기로운 아이들로<br/>
          성장하며, 다양한 경험을 통해 스스로 지식을 구성하고 확장해 가는<br/>
          깊이 있는 교육으로 모든 교육프로그램은 어린이가 중심이 됩니다.<br/>
          더불어 자람에서는 유아의 개별성과 다양성을 인정하는 것 위에<br/>
          남을 배려할 줄 아는 어린이, 새롭게 생각하는 창의적인 어린이로<br/>
          성장하도록 돕습니다.
        </p>

        <p class="text-gray-800 leading-relaxed">
          자람의 동산에서 어린이의 고운 꿈을 키워가기 위해<br/>
          부모님들의 깊은 관심과 사랑을 바랍니다.<br/>
          저와 자람의 교직원 모두는 신뢰를 바탕으로 아이들을 존중하며<br/>
          아이들이 행복한 교육이 되도록 최선의 노력을 기울일 것입니다.
        </p>

        <p class="text-right pt-8">
          <span class="text-gray-900 font-bold text-lg">자람동산 어린이집 원장</span>
        </p>
      </div>
    </div>
  `

  return (
    <SubPageLayout title={menuData.about.title} menuItems={menuData.about.items}>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">{pageTitle}</h2>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: pageContent }}
      />
    </SubPageLayout>
  )
}
