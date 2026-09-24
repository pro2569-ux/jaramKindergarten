import { notFound, permanentRedirect } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import AlbumDetail, { type AlbumRow } from '@/components/album/AlbumDetail'
import { getMenuTree, getSectionNav } from '@/lib/site-nav'
import { getGalleryPages, getPublishedAlbum } from '@/lib/public-data'

// 정적(ISR): 공개 앨범만 태그 캐시 로더로 읽는다
export const revalidate = 300 // lib/public-data PUBLIC_REVALIDATE 와 같은 값 (세그먼트 설정은 리터럴만 허용)

// ISR: 빌드 때 미리 만들지 않고 첫 요청에서 만들어 캐시한다(revalidate·태그로 갱신).
// 동적 세그먼트는 이 export 가 없으면 매 요청 서버 렌더링(캐시 없음)이 된다.
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const album = await getPublishedAlbum(id)
  return {
    title: album?.title || '앨범',
  }
}

/**
 * 앨범 상세 (/board/album/<id>). 앨범이 반별 게시판(교육활동이야기 > 반) 에 속하면
 * 그 게시판 경로(/board/<반>/<id>)로 영구 이동해 사이드바·헤더의 메뉴 위치가 유지되게 한다.
 */
export default async function AlbumDetailPage({ params }: PageProps) {
  const { id } = await params
  const album = await getPublishedAlbum(id)

  if (!album) {
    notFound()
  }

  if (album.category) {
    const [tree, galleryPages] = await Promise.all([getMenuTree(), getGalleryPages()])
    const boardRoot = tree.find((r) => r.slug === 'board')
    const classPage = galleryPages.find((p) => (p.layout_config as { category?: unknown } | null)?.category === album.category)
    const classMenu = classPage && boardRoot ? boardRoot.children.find((c) => c.slug === classPage.slug && c.children.length === 0) : undefined
    if (classMenu) permanentRedirect(`${classMenu.path}/${album.id}`)
  }

  const nav = await getSectionNav('board')

  return (
    <PageShell
      eyebrow={nav.label}
      title="앨범"
      titleAs="p"
      titleHref="/board/album"
      sidebar={<SideNav title={nav.label} items={nav.items} />}
      card={false}
    >
      <AlbumDetail album={album as AlbumRow} listHref="/board/album" />
    </PageShell>
  )
}
