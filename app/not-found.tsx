import { SearchX } from 'lucide-react'
import ContentCard from '@/components/ui/ContentCard'
import ButtonLink from '@/components/ui/ButtonLink'

// 루트 not-found: 루트 레이아웃(헤더·푸터) 안에서 렌더링된다.
export default function NotFound() {
  return (
    <div className="bg-page px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <ContentCard className="mx-auto max-w-xl py-12 text-center md:py-16">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tint">
          <SearchX className="h-8 w-8 text-primary-ink" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-semibold text-primary-ink">404</p>
        <h1 className="typo-h1 text-heading">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-muted">
          주소가 잘못되었거나, 페이지가 이동·삭제되었을 수 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">홈으로</ButtonLink>
          <ButtonLink href="/board/notice" variant="outline">
            공지사항
          </ButtonLink>
        </div>
      </ContentCard>
    </div>
  )
}
