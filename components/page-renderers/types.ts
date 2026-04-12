export interface PageData {
  id: string
  slug: string
  title: string
  content: string | null
  category: string
  page_type: string
  layout_config: Record<string, any>
  style_config: Record<string, any>
  hero_image_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface RendererProps {
  page: PageData
  layoutConfig: Record<string, any>
  styleConfig: Record<string, any>
}
