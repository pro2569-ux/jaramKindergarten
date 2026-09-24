import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { withResolvedMedia } from '@/lib/storage/media'
import type { PageData } from '@/components/page-renderers/types'

/**
 * 공개 페이지용 데이터 로더 — 쿠키 없는 anon 클라이언트 + 태그 캐시.
 *
 * - cookies() 를 쓰지 않으므로 페이지가 정적(ISR)으로 미리 만들어져 CDN 에서 바로 나간다.
 * - anon 키는 RLS 를 그대로 받는다(공개 글만 읽힘). 여기서도 is_published=true 를 한 번 더 건다.
 * - 관리자 저장 시 /api/revalidate 가 아래 태그를 무효화해 해당 페이지만 즉시 다시 만든다.
 *   태그: pages / posts / albums / legacy-media (+ menus, site-settings, site-theme 는 각자 모듈)
 * - 이관 사진의 서명 URL 은 media.ts 가 2시간 캐시(만료 6시간). 이 캐시(5분) + 페이지 캐시(5분)를 더해도
 *   URL 나이가 3시간을 넘지 않아 만료 전에 항상 갱신된다. PUBLIC_REVALIDATE 를 늘릴 때 이 합을 지킬 것.
 */
export const PUBLIC_REVALIDATE = 300

let anon: SupabaseClient | null = null
function anonClient(): SupabaseClient {
  if (!anon) {
    anon = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return anon
}

export interface PostRow {
  id: string
  board_type: string
  title: string
  content: string | null
  author_id: string | null
  is_pinned: boolean
  is_published: boolean
  view_count: number
  attachment_urls: string[] | null
  created_at: string
  updated_at: string
  legacy_source_url: string | null
  legacy_meta: Record<string, unknown> | null
  [key: string]: unknown
}

export interface AlbumCard {
  id: string
  title: string
  cover_image_url: string | null
  event_date: string | null
  created_at: string
  category: string | null
  description: string | null
  [key: string]: unknown
}

export interface AlbumDetailRow extends AlbumCard {
  is_published: boolean
}

export interface AlbumPhotoRow {
  id: string
  album_id: string
  image_url: string
  caption: string | null
  sort_order: number
  created_at: string
  [key: string]: unknown
}

// ---------------------------------------------------------------- pages (CMS)
export const getPublishedPage = unstable_cache(
  async (id: string): Promise<PageData | null> => {
    const { data } = await anonClient().from('pages').select('*').eq('id', id).eq('is_published', true).maybeSingle()
    return (data as PageData | null) ?? null
  },
  ['public-page-by-id-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['pages'] }
)

export const getPublishedPageBySlug = unstable_cache(
  async (slug: string): Promise<PageData | null> => {
    const { data } = await anonClient().from('pages').select('*').eq('slug', slug).eq('is_published', true).maybeSingle()
    return (data as PageData | null) ?? null
  },
  ['public-page-by-slug-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['pages'] }
)

/** 반별 갤러리 페이지 목록 (slug, layout_config) — 앨범 상세의 반 게시판 경로 찾기용 */
export const getGalleryPages = unstable_cache(
  async (): Promise<Array<{ slug: string; layout_config: Record<string, unknown> | null }>> => {
    const { data } = await anonClient().from('pages').select('slug, layout_config').eq('page_type', 'gallery').eq('is_published', true)
    return (data as Array<{ slug: string; layout_config: Record<string, unknown> | null }> | null) ?? []
  },
  ['public-gallery-pages-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['pages'] }
)

// ---------------------------------------------------------------- posts
export interface PostsPage {
  posts: PostRow[]
  count: number
}

/** 게시판 한 페이지 (개수 포함, 쿼리 1번). legacy: 'only' 이관 글만(교육자료실) / 'exclude' 새 글만(가정통신문) / 'all' */
export const getPostsPage = unstable_cache(
  async (board: string, page: number, pageSize: number, legacy: 'only' | 'exclude' | 'all' = 'all'): Promise<PostsPage> => {
    let q = anonClient().from('posts').select('*', { count: 'exact' }).eq('board_type', board).eq('is_published', true)
    if (legacy === 'only') q = q.not('legacy_source_url', 'is', null)
    if (legacy === 'exclude') q = q.is('legacy_source_url', null)
    const from = Math.max(0, (page - 1) * pageSize)
    const { data, count } = await q
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    return { posts: (data as PostRow[] | null) ?? [], count: count ?? 0 }
  },
  ['public-posts-page-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['posts'] }
)

/** 공개 글 1건. legacyOnly: 이관 글만 허용(교육자료실 상세) */
export const getPublishedPost = unstable_cache(
  async (board: string, id: string, legacyOnly = false): Promise<PostRow | null> => {
    let q = anonClient().from('posts').select('*').eq('id', id).eq('board_type', board).eq('is_published', true)
    if (legacyOnly) q = q.not('legacy_source_url', 'is', null)
    const { data } = await q.maybeSingle()
    return (data as PostRow | null) ?? null
  },
  ['public-post-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['posts'] }
)

/** 메인 공지 미리보기 (상단 고정 우선, 5건) */
export const getHomeNotices = unstable_cache(
  async (): Promise<PostRow[]> => {
    const { data } = await anonClient()
      .from('posts')
      .select('id, title, is_pinned, created_at')
      .eq('board_type', 'notice')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)
    return (data as unknown as PostRow[] | null) ?? []
  },
  ['public-home-notices-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['posts'] }
)

// ---------------------------------------------------------------- albums
export const getPublishedAlbum = unstable_cache(
  async (id: string): Promise<AlbumDetailRow | null> => {
    const { data } = await anonClient().from('albums').select('*').eq('id', id).eq('is_published', true).maybeSingle()
    return (data as AlbumDetailRow | null) ?? null
  },
  ['public-album-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['albums'] }
)

/** 앨범 사진 (이관 사진은 서명 URL 로 해석) */
export const getAlbumPhotos = unstable_cache(
  async (albumId: string): Promise<AlbumPhotoRow[]> => {
    const { data } = await anonClient().from('album_photos').select('*').eq('album_id', albumId).order('sort_order').order('created_at')
    return withResolvedMedia((data as AlbumPhotoRow[] | null) ?? [], 'image_url')
  },
  ['public-album-photos-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['albums', 'legacy-media'] }
)

/** 반별(카테고리) 또는 전체 공개 앨범 목록, 커버는 서명 URL 로 해석 */
export const getAlbumsByCategory = unstable_cache(
  async (category: string | null): Promise<AlbumCard[]> => {
    let q = anonClient()
      .from('albums')
      .select('id, title, cover_image_url, event_date, created_at, category, description')
      .eq('is_published', true)
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (category) q = q.eq('category', category)
    const { data } = await q
    return withResolvedMedia((data as AlbumCard[] | null) ?? [], 'cover_image_url')
  },
  ['public-albums-by-category-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['albums', 'legacy-media'] }
)

/** 전체 앨범 목록 한 페이지 (/board/album) */
export const getAlbumsPage = unstable_cache(
  async (page: number, pageSize: number): Promise<{ albums: AlbumCard[]; count: number }> => {
    const from = Math.max(0, (page - 1) * pageSize)
    const { data, count } = await anonClient()
      .from('albums')
      .select('id, title, cover_image_url, event_date, created_at, category, description', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    return { albums: await withResolvedMedia((data as AlbumCard[] | null) ?? [], 'cover_image_url'), count: count ?? 0 }
  },
  ['public-albums-page-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['albums', 'legacy-media'] }
)

/** 메인 최근 앨범 4건 */
export const getHomeAlbums = unstable_cache(
  async (): Promise<AlbumCard[]> => {
    const { data } = await anonClient()
      .from('albums')
      .select('id, title, cover_image_url, event_date, created_at, category, description')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(4)
    return withResolvedMedia((data as AlbumCard[] | null) ?? [], 'cover_image_url')
  },
  ['public-home-albums-v1'],
  { revalidate: PUBLIC_REVALIDATE, tags: ['albums', 'legacy-media'] }
)
