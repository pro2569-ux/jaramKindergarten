export type PageType =
  | 'single'
  | 'list'
  | 'gallery'
  | 'pdf_list'
  | 'card_grid'
  | 'faq'
  | 'timeline'

// ── single ────────────────────────────────────────────────────
// content: pages.content (HTML 문자열)
// layout_config: 표시 옵션만. 데이터 아이템 없음.
export interface SingleLayoutConfig {
  width?: 'narrow' | 'medium' | 'wide'
  showTOC?: boolean
}

// ── list ──────────────────────────────────────────────────────
// content: posts 테이블에서 boardType으로 조회
// layout_config: 표시 옵션 + 어느 게시판을 보여줄지(boardType)
export interface ListLayoutConfig {
  boardType?: 'notice' | 'newsletter' | 'free'
  columns?: 1 | 2
  showThumbnail?: boolean
  pageSize?: 10 | 15 | 20
}

// ── gallery ───────────────────────────────────────────────────
// content: albums 테이블에서 조회
// layout_config: 표시 옵션만. 데이터 아이템 없음.
export interface GalleryLayoutConfig {
  columns?: 2 | 3 | 4
  aspectRatio?: 'square' | 'video' | 'auto'
  gap?: 'sm' | 'md' | 'lg'
}

// ── pdf_list ──────────────────────────────────────────────────
// content: layout_config.items 배열 (별도 테이블 없음)
export interface PdfItem {
  id: string
  title: string
  file_url: string
  date?: string
  description?: string
}

export interface PdfListLayoutConfig {
  sortBy?: 'date' | 'name'
  showPreview?: boolean
  items?: PdfItem[]
}

// ── card_grid ─────────────────────────────────────────────────
// content: layout_config.items 배열
export interface CardItem {
  id: string
  title: string
  description?: string
  image_url?: string
  link_url?: string
}

export interface CardGridLayoutConfig {
  columns?: 2 | 3 | 4
  cardStyle?: 'bordered' | 'shadow' | 'flat'
  items?: CardItem[]
}

// ── faq ───────────────────────────────────────────────────────
// content: layout_config.items 배열
export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqLayoutConfig {
  expandStyle?: 'single' | 'multiple'
  items?: FaqItem[]
}

// ── timeline ──────────────────────────────────────────────────
// content: layout_config.items 배열
export interface TimelineItem {
  id: string
  date: string
  title: string
  description?: string
}

export interface TimelineLayoutConfig {
  direction?: 'vertical' | 'horizontal'
  items?: TimelineItem[]
}

// ── style_config (모든 타입 공통) ─────────────────────────────
export interface StyleConfig {
  primaryColor?: string
  accentColor?: string
  fontFamily?: 'pretendard' | 'nanum' | 'notoserif'
  headingSize?: 'sm' | 'md' | 'lg'
  spacing?: 'compact' | 'normal' | 'relaxed'
}

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  single:    '단일 페이지',
  list:      '리스트 게시판',
  gallery:   '갤러리',
  pdf_list:  'PDF 목록',
  card_grid: '카드 그리드',
  faq:       'Q&A',
  timeline:  '타임라인',
}
