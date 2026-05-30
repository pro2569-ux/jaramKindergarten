-- ============================================================
-- Seed: layout_system
-- 실행 조건: 20260529000000_layout_system.sql 마이그레이션 적용 후
-- 실행 방법: Supabase SQL Editor에서 수동 실행 (재실행 안전)
-- 멱등성:
--   대분류 → ON CONFLICT (slug) WHERE parent_id IS NULL DO NOTHING
--   소분류 → ON CONFLICT (parent_id, slug) WHERE parent_id IS NOT NULL DO NOTHING
--   실행 순서: 대분류 INSERT 완료 후 소분류 INSERT (순차 보장)
-- ============================================================

-- ============================================================
-- STEP 5-A. menus 시드: 대분류 5개
-- ============================================================
INSERT INTO menus (label, slug, depth, sort_order) VALUES
  ('어린이집소개',   'about',      0, 1),
  ('교육프로그램',   'curriculum', 0, 2),
  ('입학안내',       'admission',  0, 3),
  ('교육활동이야기', 'board',      0, 4),
  ('커뮤니티',       'community',  0, 5)
ON CONFLICT (slug) WHERE parent_id IS NULL DO NOTHING;

-- ============================================================
-- STEP 5-B. menus 시드: 소분류 — 어린이집소개(about) 하위 4개
--   parent_id는 slug='about' 인 최상위 행을 서브쿼리로 조회
-- ============================================================
INSERT INTO menus (parent_id, label, slug, depth, sort_order) VALUES
  (
    (SELECT id FROM menus WHERE slug = 'about' AND parent_id IS NULL),
    '원장 인사말', 'greeting', 1, 1
  ),
  (
    (SELECT id FROM menus WHERE slug = 'about' AND parent_id IS NULL),
    '교육이념 및 원훈', 'philosophy', 1, 2
  ),
  (
    (SELECT id FROM menus WHERE slug = 'about' AND parent_id IS NULL),
    '교육환경', 'environment', 1, 3
  ),
  (
    (SELECT id FROM menus WHERE slug = 'about' AND parent_id IS NULL),
    '시설현황', 'facilities', 1, 4
  )
ON CONFLICT (parent_id, slug) WHERE parent_id IS NOT NULL DO NOTHING;

-- ============================================================
-- STEP 5-C. menus 시드: 소분류 — 교육프로그램(curriculum) 하위 4개
-- ============================================================
INSERT INTO menus (parent_id, label, slug, depth, sort_order) VALUES
  (
    (SELECT id FROM menus WHERE slug = 'curriculum' AND parent_id IS NULL),
    '표준보육과정', 'standard', 1, 1
  ),
  (
    (SELECT id FROM menus WHERE slug = 'curriculum' AND parent_id IS NULL),
    '누리과정', 'nuri', 1, 2
  ),
  (
    (SELECT id FROM menus WHERE slug = 'curriculum' AND parent_id IS NULL),
    '자연주의 유아교육', 'nature', 1, 3
  ),
  (
    (SELECT id FROM menus WHERE slug = 'curriculum' AND parent_id IS NULL),
    '숲유치원 프로그램', 'forest', 1, 4
  )
ON CONFLICT (parent_id, slug) WHERE parent_id IS NOT NULL DO NOTHING;

-- ============================================================
-- STEP 6. site_theme 시드: 기본 테마 1개 (is_active=true)
--   idx_site_theme_single_active 인덱스로 중복 활성 방지됨
--   이미 active 테마가 있으면 SKIP
-- ============================================================
INSERT INTO site_theme (name, is_active)
SELECT '기본 테마', true
WHERE NOT EXISTS (SELECT 1 FROM site_theme WHERE is_active = true);
