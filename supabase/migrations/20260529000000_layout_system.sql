-- ============================================================
-- Migration: layout_system
-- Created: 2026-05-29
-- Depends on: 20240101000000_init_schema (pages, profiles 테이블)
-- 멱등성: 이미 적용된 경우에도 안전하게 재실행 가능
-- ============================================================

-- ============================================================
-- STEP 1. pages 테이블 확장 (IF NOT EXISTS로 멱등)
-- ============================================================
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS page_type TEXT
    DEFAULT 'single'
    CHECK (page_type IN (
      'single',
      'list',
      'gallery',
      'pdf_list',
      'card_grid',
      'faq',
      'timeline'
    ));

ALTER TABLE pages ADD COLUMN IF NOT EXISTS layout_config  JSONB DEFAULT '{}';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS style_config   JSONB DEFAULT '{}';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_title     TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_subtitle  TEXT;

-- ============================================================
-- STEP 2. site_theme 테이블 생성 (IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_theme (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT    NOT NULL DEFAULT 'default',
  is_active        BOOLEAN          DEFAULT false,
  primary_color    TEXT             DEFAULT '#4f46e5',
  secondary_color  TEXT             DEFAULT '#f59e0b',
  background_color TEXT             DEFAULT '#ffffff',
  text_color       TEXT             DEFAULT '#1e293b',
  heading_font     TEXT             DEFAULT 'pretendard',
  body_font        TEXT             DEFAULT 'pretendard',
  header_style     TEXT             DEFAULT 'default'
    CHECK (header_style IN ('default', 'centered', 'minimal')),
  created_at       TIMESTAMPTZ      DEFAULT now()
);

-- is_active = true 인 행은 최대 1개로 강제 (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_theme_single_active
  ON site_theme(is_active)
  WHERE is_active = true;

-- ============================================================
-- STEP 3. menus 테이블 생성 (IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS menus (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID        REFERENCES menus(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  page_id    UUID        REFERENCES pages(id) ON DELETE SET NULL,
  sort_order INT         DEFAULT 0,
  is_visible BOOLEAN     DEFAULT true,
  depth      INT         DEFAULT 0 CHECK (depth IN (0, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_menus_top_slug
  ON menus(slug)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menus_child_slug
  ON menus(parent_id, slug)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_sort   ON menus(sort_order);

-- 트리거: 이미 존재할 경우 DROP 후 재생성
DROP TRIGGER IF EXISTS update_menus_updated_at ON menus;
CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 4. RLS 활성화 및 정책
--   정책: DROP IF EXISTS → CREATE 패턴으로 멱등 처리
-- ============================================================
ALTER TABLE menus      ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_theme ENABLE ROW LEVEL SECURITY;

-- menus 정책
DROP POLICY IF EXISTS "Anyone can read visible menus" ON menus;
CREATE POLICY "Anyone can read visible menus"
  ON menus FOR SELECT
  USING (is_visible = true);

DROP POLICY IF EXISTS "Admins manage menus" ON menus;
CREATE POLICY "Admins manage menus"
  ON menus FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- site_theme 정책
DROP POLICY IF EXISTS "Anyone can read active theme" ON site_theme;
CREATE POLICY "Anyone can read active theme"
  ON site_theme FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage themes" ON site_theme;
CREATE POLICY "Admins manage themes"
  ON site_theme FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
