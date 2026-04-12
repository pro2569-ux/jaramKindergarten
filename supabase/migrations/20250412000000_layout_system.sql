-- ============================================================
-- Phase 1: 어드민 레이아웃 관리 시스템
-- menus, pages 확장, site_theme 테이블 생성
-- ============================================================

-- ============================================
-- 1. menus 테이블 (상단 메뉴 동적 관리)
-- ============================================
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                    -- 메뉴 표시 이름
  slug TEXT NOT NULL,                     -- URL 경로 (예: 'about', 'greeting')
  page_id UUID REFERENCES pages(id),      -- 연결된 페이지 (소분류만)
  sort_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  depth INT DEFAULT 0,                    -- 0=대분류, 1=소분류
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_sort ON menus(sort_order);

-- ============================================
-- 2. pages 테이블 확장 (기존 테이블에 컬럼 추가)
-- ============================================
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_type TEXT
  DEFAULT 'single' CHECK (page_type IN (
    'single',      -- 단일 페이지 (인사말, 교육이념)
    'list',        -- 리스트 게시판 (공지사항, 가정통신문)
    'gallery',     -- 갤러리 (앨범)
    'pdf_list',    -- PDF 목록 (식단표, 모집요강)
    'card_grid',   -- 카드 그리드 (교직원, 특색활동)
    'faq',         -- Q&A 아코디언
    'timeline'     -- 연혁/일정표
  ));

ALTER TABLE pages ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{}';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;

-- layout_config 예시 (타입별로 다름):
-- single:    { "width": "narrow|medium|wide", "showTOC": true }
-- list:      { "columns": 1, "showThumbnail": true, "pageSize": 10 }
-- gallery:   { "columns": 3, "aspectRatio": "square|video", "gap": "sm|md|lg" }
-- pdf_list:  { "sortBy": "date|name", "showPreview": true }
-- card_grid: { "columns": 3, "cardStyle": "bordered|shadow|flat" }

-- style_config 예시:
-- {
--   "primaryColor": "#4f46e5",
--   "accentColor": "#f59e0b",
--   "fontFamily": "pretendard|nanum|notoserif",
--   "headingSize": "sm|md|lg",
--   "spacing": "compact|normal|relaxed"
-- }

-- ============================================
-- 3. site_theme 테이블 (사이트 전역 테마)
-- ============================================
CREATE TABLE IF NOT EXISTS site_theme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN DEFAULT false,
  primary_color TEXT DEFAULT '#4f46e5',
  secondary_color TEXT DEFAULT '#f59e0b',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1e293b',
  heading_font TEXT DEFAULT 'pretendard',
  body_font TEXT DEFAULT 'pretendard',
  header_style TEXT DEFAULT 'default',  -- default|centered|minimal
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. RLS 정책
-- ============================================
-- 주의: is_admin() 함수는 20240101000002_fix_profiles_recursion.sql에서 생성됨
--       profiles 재귀 방지를 위해 이 함수를 재사용

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_theme ENABLE ROW LEVEL SECURITY;

-- menus: 공개 읽기 + admin 관리
CREATE POLICY "Anyone can read visible menus"
  ON menus FOR SELECT USING (is_visible = true);

CREATE POLICY "Admins manage menus"
  ON menus FOR ALL USING (public.is_admin());

-- site_theme: 활성 테마 공개 읽기 + admin 관리
CREATE POLICY "Anyone can read active theme"
  ON site_theme FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage themes"
  ON site_theme FOR ALL USING (public.is_admin());

-- ============================================
-- 5. 기존 메뉴 데이터 시드 (menu-items.ts 기반)
-- ============================================
-- 대분류 (중복 방지)
INSERT INTO menus (label, slug, depth, sort_order)
SELECT * FROM (VALUES
  ('어린이집소개', 'about', 0, 1),
  ('교육프로그램', 'curriculum', 0, 2),
  ('입학안내', 'admission', 0, 3),
  ('교육활동이야기', 'board', 0, 4),
  ('커뮤니티', 'community', 0, 5)
) AS v(label, slug, depth, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE parent_id IS NULL AND menus.slug = v.slug
);

-- 기본 테마 시드
INSERT INTO site_theme (name, is_active, primary_color, secondary_color)
SELECT 'default', true, '#4CAF50', '#FF9800'
WHERE NOT EXISTS (SELECT 1 FROM site_theme WHERE name = 'default');
