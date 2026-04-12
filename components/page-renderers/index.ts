import { PageType } from '@/lib/page-types'
import SinglePageRenderer from './SinglePageRenderer'
import ListBoardRenderer from './ListBoardRenderer'
import GalleryRenderer from './GalleryRenderer'
import PdfListRenderer from './PdfListRenderer'
import CardGridRenderer from './CardGridRenderer'
import FaqRenderer from './FaqRenderer'
import TimelineRenderer from './TimelineRenderer'

const rendererMap: Record<PageType, React.ComponentType<any>> = {
  single: SinglePageRenderer,
  list: ListBoardRenderer,
  gallery: GalleryRenderer,
  pdf_list: PdfListRenderer,
  card_grid: CardGridRenderer,
  faq: FaqRenderer,
  timeline: TimelineRenderer,
}

export function getRendererByType(pageType: string) {
  return rendererMap[pageType as PageType] || SinglePageRenderer
}

export {
  SinglePageRenderer,
  ListBoardRenderer,
  GalleryRenderer,
  PdfListRenderer,
  CardGridRenderer,
  FaqRenderer,
  TimelineRenderer,
}
