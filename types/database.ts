/**
 * 데이터베이스 타입 정의
 */

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
  category: 'about' | 'curriculum'
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
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
  /** 반(교육활동이야기 게시판) 이름. 이관 앨범은 원본 게시판명, 새 앨범은 ALBUM_CATEGORIES 중 하나 */
  category: string | null
  /** 이관 앨범의 원본 URL (jaramk.com). 새 앨범은 null */
  legacy_source_url: string | null
  /** 이관 메타(원본 게시판 ID·글 번호·본문 HTML 등). 새 앨범은 null */
  legacy_meta: Record<string, unknown> | null
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
  /** 이관 사진의 원본 URL. 새 사진은 null */
  legacy_source_url: string | null
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
