-- ============================================================
-- 기존 pages 데이터를 menus 소분류에 연결하는 시드 스크립트
-- 기존 정적 페이지들의 데이터를 동적 라우트로 이관
-- ============================================================

-- 1. 기존 pages에 page_type이 없는 레코드에 기본값 설정
UPDATE pages SET page_type = 'single' WHERE page_type IS NULL;

-- 2. about 대분류의 소분류 추가 + pages 연결
DO $$
DECLARE
  v_about_id UUID;
  v_curriculum_id UUID;
  v_page_id UUID;
BEGIN
  -- about 대분류 ID 조회
  SELECT id INTO v_about_id FROM menus WHERE slug = 'about' AND depth = 0 LIMIT 1;

  IF v_about_id IS NOT NULL THEN
    -- greeting (원장 인사말)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'greeting' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, content, is_published)
      VALUES ('greeting', '원장 인사말', 'about', 'single',
        '<div class="space-y-6"><h2 class="text-2xl font-bold text-primary mb-4">자람동산 어린이집에 오신 것을 환영합니다.</h2><p>자람동산 어린이집은 아이들의 꿈과 희망을 키워주는 행복한 배움터입니다.</p><p>저희 어린이집은 아이 한 명 한 명의 소중한 개성과 잠재력을 존중하며, 따뜻한 사랑과 전문적인 교육으로 아이들이 건강하고 행복하게 성장할 수 있도록 최선을 다하고 있습니다.</p><p>자연과 함께하는 교육환경에서 아이들은 호기심과 탐구심을 키우고, 친구들과의 관계 속에서 배려와 협동의 가치를 배워갑니다.</p><p>학부모님들과의 소통을 중시하며, 가정과 어린이집이 함께 아이들의 성장을 응원하는 파트너가 되겠습니다.</p><p class="font-semibold text-gray-800 mt-8">자람동산 어린이집 원장</p></div>',
        true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_about_id AND slug = 'greeting') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_about_id, '원장 인사말', 'greeting', v_page_id, 1, 1);
    END IF;

    -- philosophy (교육이념)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'philosophy' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('philosophy', '교육이념 및 원훈', 'about', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_about_id AND slug = 'philosophy') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_about_id, '교육이념 및 원훈', 'philosophy', v_page_id, 1, 2);
    END IF;

    -- environment (교육환경)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'environment' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('environment', '교육환경', 'about', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_about_id AND slug = 'environment') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_about_id, '교육환경', 'environment', v_page_id, 1, 3);
    END IF;

    -- facilities (시설현황)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'facilities' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('facilities', '시설현황', 'about', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_about_id AND slug = 'facilities') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_about_id, '시설현황', 'facilities', v_page_id, 1, 4);
    END IF;
  END IF;

  -- curriculum 대분류 ID 조회
  SELECT id INTO v_curriculum_id FROM menus WHERE slug = 'curriculum' AND depth = 0 LIMIT 1;

  IF v_curriculum_id IS NOT NULL THEN
    -- standard (표준보육과정)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'standard' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('standard', '표준보육과정', 'curriculum', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_curriculum_id AND slug = 'standard') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_curriculum_id, '표준보육과정', 'standard', v_page_id, 1, 1);
    END IF;

    -- nuri (누리과정)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'nuri' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('nuri', '누리과정', 'curriculum', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_curriculum_id AND slug = 'nuri') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_curriculum_id, '누리과정', 'nuri', v_page_id, 1, 2);
    END IF;

    -- nature (자연주의 유아교육)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'nature' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('nature', '자연주의 유아교육', 'curriculum', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_curriculum_id AND slug = 'nature') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_curriculum_id, '자연주의 유아교육', 'nature', v_page_id, 1, 3);
    END IF;

    -- forest (숲유치원 프로그램)
    SELECT id INTO v_page_id FROM pages WHERE slug = 'forest' LIMIT 1;
    IF v_page_id IS NULL THEN
      INSERT INTO pages (slug, title, category, page_type, is_published)
      VALUES ('forest', '숲유치원 프로그램', 'curriculum', 'single', true)
      RETURNING id INTO v_page_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM menus WHERE parent_id = v_curriculum_id AND slug = 'forest') THEN
      INSERT INTO menus (parent_id, label, slug, page_id, depth, sort_order) VALUES (v_curriculum_id, '숲유치원 프로그램', 'forest', v_page_id, 1, 4);
    END IF;
  END IF;
END $$;
