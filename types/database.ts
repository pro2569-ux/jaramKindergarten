import type { PageType, StyleConfig } from '@/lib/page-types'

export interface Profile {
  id: string
  name: string
  email: string | null
  role: 'admin' | 'teacher' | 'parent'
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  slug: string
  title: string
  content: string | null
  category: 'about' | 'curriculum' | 'admission' | 'board' | 'community'
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
  // layout_system 마이그레이션에서 추가된 컬럼 (옵셔널: 구버전 쿼리 호환)
  page_type?: PageType | null
  layout_config?: Record<string, unknown> | null
  style_config?: StyleConfig | null
  hero_image_url?: string | null
  hero_title?: string | null
  hero_subtitle?: string | null
}

export interface Post {
  id: string
  board_type: 'notice' | 'newsletter' | 'free'
  title: string
  content: string | null
  author_id: string | null
  is_pinned: boolean
  is_published: boolean
  view_count: number
  attachment_urls: string[] | null
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Album {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  author_id: string | null
  is_published: boolean
  event_date: string | null
  created_at: string
  author?: Profile
  photos?: AlbumPhoto[]
}

export interface AlbumPhoto {
  id: string
  album_id: string
  image_url: string
  caption: string | null
  sort_order: number
  created_at: string
}

export interface MealPlan {
  id: string
  year: number
  month: number
  week: number | null
  title: string | null
  file_url: string | null
  content: any | null
  created_at: string
}

export interface Teacher {
  id: string
  name: string
  position: string
  class_name: string | null
  photo_url: string | null
  introduction: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Inquiry {
  id: string
  author_name: string
  author_email: string | null
  author_phone: string | null
  title: string
  content: string
  reply: string | null
  replied_at: string | null
  is_private: boolean
  status: 'pending' | 'replied' | 'closed'
  created_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string | null
  description: string | null
  updated_at: string
}

export interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Menu {
  id: string
  parent_id: string | null
  label: string
  slug: string
  page_id: string | null
  sort_order: number
  is_visible: boolean
  depth: 0 | 1
  created_at: string
  updated_at: string
  children?: Menu[]
}

export interface SiteTheme {
  id: string
  name: string
  is_active: boolean
  primary_color: string
  secondary_color: string
  background_color: string
  text_color: string
  heading_font: string
  body_font: string
  header_style: 'default' | 'centered' | 'minimal'
  created_at: string
}
