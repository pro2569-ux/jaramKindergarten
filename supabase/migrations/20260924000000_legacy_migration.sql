-- ============================================================
-- jaramk.com 콘텐츠 이관 준비
--  1) 원본 식별자/메타 컬럼 (같은 원본을 두 번 넣지 않기 위한 legacy_source_url UNIQUE, 상태 메타 legacy_meta)
--  2) 앨범 분류 컬럼 (albums.category = 원본 게시판 이름: 자람반 등)
--  3) 이관 앨범 사진용 private 버킷 legacy-media (서명 URL 로만 열람)
-- 기존 데이터/정책에는 영향 없음 (컬럼 추가 + 버킷/정책 추가만).
-- 적용: Supabase 대시보드 SQL Editor 에서 실행.
-- ============================================================

-- 1. pages
ALTER TABLE pages ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pages_legacy_source_url
  ON pages (legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- 1. posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_legacy_source_url
  ON posts (legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- 1+2. albums
ALTER TABLE albums ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_albums_legacy_source_url
  ON albums (legacy_source_url) WHERE legacy_source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_category ON albums (category);

-- 1. album_photos (사진 단위 중복 방지: 원본 이미지 URL)
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_album_photos_legacy_source_url
  ON album_photos (legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- 1. menus (원본 pageCode 추적용. UNIQUE(parent_id, slug) 는 이미 있음)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;

-- 3. private 버킷 legacy-media
--    public = false 이므로 공개 URL 로는 접근 불가. 앱은 서버에서 service role 로 서명 URL(만료 1시간)을 만들어 보여준다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legacy-media', 'legacy-media', false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. 정책: 관리자만 이 버킷의 객체를 직접 조회/관리 가능 (anon/authenticated 정책은 두지 않음 → 서명은 서버에서만)
--    service role 은 RLS 를 우회하므로 이관 스크립트/서명 발급에는 정책이 필요 없다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins manage legacy media'
  ) THEN
    CREATE POLICY "Admins manage legacy media" ON storage.objects
      FOR ALL
      USING (bucket_id = 'legacy-media' AND public.is_admin())
      WITH CHECK (bucket_id = 'legacy-media' AND public.is_admin());
  END IF;
END $$;
