import type { Page } from '@/types/database'
import type { PageType } from '@/lib/page-types'
import SinglePageRenderer from './SinglePageRenderer'
import ListBoardRenderer from './ListBoardRenderer'
import GalleryRenderer from './GalleryRenderer'
import PdfListRenderer from './PdfListRenderer'
import CardGridRenderer from './CardGridRenderer'
import FaqRenderer from './FaqRenderer'
import TimelineRenderer from './TimelineRenderer'

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

export default function PageRenderer({ page }: { page: Page }) {
  const pageType = (page.page_type ?? 'single') as PageType
  const Renderer = RENDERER_MAP[pageType] ?? RENDERER_MAP.single
  return <Renderer page={page} />
}
