import { createClient } from '@/lib/supabase/server'
import { notFound, permanentRedirect } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import AlbumDetail, { type AlbumRow } from '@/components/album/AlbumDetail'
import { getMenuTree, getSectionNav } from '@/lib/site-nav'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: album } = await supabase
    .from('albums')
    .select('title')
    .eq('id', id)
    .single()

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
  const supabase = await createClient()

  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!album) {
    notFound()
  }

  if (album.category) {
    const [tree, { data: galleryPages }] = await Promise.all([
      getMenuTree(),
      supabase.from('pages').select('slug, layout_config').eq('page_type', 'gallery').eq('is_published', true),
    ])
    const boardRoot = tree.find((r) => r.slug === 'board')
    const classPage = (galleryPages ?? []).find((p) => (p.layout_config as { category?: unknown } | null)?.category === album.category)
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
