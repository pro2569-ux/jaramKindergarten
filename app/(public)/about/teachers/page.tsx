import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { User, Users } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import EmptyState from '@/components/ui/EmptyState'
import { getSectionNav } from '@/lib/site-nav'
import { sanitizeHtml } from '@/lib/sanitize'

export const metadata = {
  title: '교원 및 반편성',
}

export default async function TeachersPage() {
  const supabase = await createClient()
  const nav = await getSectionNav('about')

  const [{ data: teachers }, { data: cmsPage }] = await Promise.all([
    supabase.from('teachers').select('*').eq('is_active', true).order('sort_order'),
    // 이관 CMS 행(교원/반편성, slug=teachers)의 글 버전 — 조직도 이미지의 접근성·검색용 텍스트
    supabase.from('pages').select('content').eq('slug', 'teachers').eq('is_published', true).maybeSingle(),
  ])
  const cmsHtml = typeof cmsPage?.content === 'string' && cmsPage.content.trim() ? sanitizeHtml(cmsPage.content) : ''

  return (
    <PageShell
      eyebrow={nav.label}
      title="교원 및 반편성"
      subtitle="사랑과 전문성으로 아이들을 가르치는 우리 선생님들을 소개합니다"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
    >
      {/* 조직도·반편성 이미지 */}
      <div className="mb-6 flex justify-center">
        <Image
          src="/images/teacher.png"
          alt="교원 및 반편성 조직도"
          width={1200}
          height={900}
          sizes="(min-width: 1024px) 840px, 100vw"
          className="h-auto w-full max-w-4xl rounded-card border border-border"
          priority
        />
      </div>

      {/* 조직도 내용을 글로 (화면 낭독기·검색용). CMS pages 의 teachers 행 본문 */}
      {cmsHtml && (
        <details className="mb-10 rounded-card border border-border bg-surface px-4 py-3 md:px-5">
          <summary className="cursor-pointer text-base font-semibold text-heading">교직원·학급 현황 글로 보기</summary>
          <div className="content mt-4" dangerouslySetInnerHTML={{ __html: cmsHtml }} />
        </details>
      )}

      <h2 className="typo-h2 mb-6 text-heading">교직원 소개</h2>

      {teachers && teachers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-square bg-gray-100">
                {teacher.photo_url ? (
                  <Image
                    src={teacher.photo_url}
                    alt={teacher.name}
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <User className="h-24 w-24 text-disabled" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="typo-h3 text-heading">{teacher.name}</h3>
                  <span className="text-sm font-medium text-primary-ink">{teacher.position}</span>
                </div>
                {teacher.class_name && (
                  <p className="mb-3 text-sm text-muted">{teacher.class_name} 담당</p>
                )}
                {teacher.introduction && (
                  <p className="line-clamp-3 text-sm text-body">{teacher.introduction}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="등록된 교직원 정보가 없습니다." />
      )}
    </PageShell>
  )
}
