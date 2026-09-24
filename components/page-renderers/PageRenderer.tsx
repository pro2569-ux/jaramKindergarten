import type { Page } from '@/types/database'
import type { PageType } from '@/lib/page-types'
import SinglePageRenderer from './SinglePageRenderer'
import ListBoardRenderer from './ListBoardRenderer'
import GalleryRenderer from './GalleryRenderer'
import PdfListRenderer from './PdfListRenderer'
import CardGridRenderer from './CardGridRenderer'
import FaqRenderer from './FaqRenderer'
import TimelineRenderer from './TimelineRenderer'
import GreetingRenderer from './GreetingRenderer'

// React.ComponentType은 async 서버 컴포넌트를 포함하지 않으므로
// Next.js 15 / React 19의 async 서버 컴포넌트를 위해 any 허용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RENDERER_MAP: Record<PageType, (props: { page: Page }) => any> = {
  single:    SinglePageRenderer,
  list:      ListBoardRenderer,
  gallery:   GalleryRenderer,
  pdf_list:  PdfListRenderer,
  card_grid: CardGridRenderer,
  faq:       FaqRenderer,
  timeline:  TimelineRenderer,
}

// slug 전용 디자인 오버라이드 (page_type 분기보다 우선).
// 특정 slug에만 전용 레이아웃을 입힐 때 여기 한 줄 추가하면 됨.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SLUG_RENDERERS: Record<string, (props: { page: Page }) => any> = {
  greeting: GreetingRenderer,
}

export default function PageRenderer({ page }: { page: Page }) {
  const SlugRenderer = SLUG_RENDERERS[page.slug]
  if (SlugRenderer) return <SlugRenderer page={page} />

  const pageType = (page.page_type ?? 'single') as PageType
  const Renderer = RENDERER_MAP[pageType] ?? RENDERER_MAP.single
  return <Renderer page={page} />
}
