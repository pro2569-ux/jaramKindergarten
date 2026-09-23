-- ============================================================
-- [초안 — 승인 전 적용 금지]
-- jaramk.com 이관용 컬럼 추가 제안. 승인되면 supabase/migrations/2026MMDDhhmmss_legacy_migration.sql 로 옮겨 적용.
--
-- 목적
--  1) 같은 원본을 두 번 넣지 않기 위한 원본 식별자 (legacy_source_url UNIQUE)
--  2) 이관 상태/출처 메타 (legacy_meta JSONB: 원본 글번호, 게시판, 날짜 출처, 사진 미수집 플래그 등)
--  3) 앨범을 반별로 구분하기 위한 category (albums 에는 분류 컬럼이 없음)
--  4) (선택) 교육자료실을 별도 게시판 타입으로 둘 경우 board_type 확장
-- 기존 데이터와 RLS 정책에는 영향 없음 (컬럼 추가만, 기본값 NULL).
-- ============================================================

-- pages: 정적 페이지
ALTER TABLE pages ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pages_legacy_source_url ON pages(legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- posts: 교육자료실 / 입소신청서
ALTER TABLE posts ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_legacy_source_url ON posts(legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- albums: 반별 앨범 (category = '자람반' 등 원본 게시판 이름)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS legacy_meta JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_albums_legacy_source_url ON albums(legacy_source_url) WHERE legacy_source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_category ON albums(category);

-- album_photos: 사진 단위 중복 방지 (원본 이미지 URL)
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_album_photos_legacy_source_url ON album_photos(legacy_source_url) WHERE legacy_source_url IS NOT NULL;

-- menus: 원본 pageCode 추적 (UNIQUE(parent_id, slug) 는 이미 있음)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS legacy_source_url TEXT;

-- (선택 B안) 교육자료실을 'archive' 타입으로 둘 때만 적용. A안(newsletter 로 매핑)이면 불필요.
-- ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_board_type_check;
-- ALTER TABLE posts ADD CONSTRAINT posts_board_type_check
--   CHECK (board_type IN ('notice', 'newsletter', 'free', 'archive'));
