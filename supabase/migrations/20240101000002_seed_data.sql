-- 기본 사이트 설정 데이터
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name', '자람동산어린이집', '사이트 이름'),
  ('site_description', '아이들이 건강하게 자라는 곳', '사이트 설명'),
  ('phone', '02-1234-5678', '대표 전화번호'),
  ('fax', '02-1234-5679', '팩스 번호'),
  ('email', 'info@jaramk.com', '대표 이메일'),
  ('address', '서울특별시 강남구 테헤란로 123', '주소'),
  ('kakao_map_lat', '37.5665', '카카오맵 위도'),
  ('kakao_map_lng', '126.9780', '카카오맵 경도'),
  ('logo_url', '', '로고 이미지 URL'),
  ('business_hours', '평일 07:30 ~ 19:30', '운영 시간'),
  ('established_date', '2020-03-01', '설립일');

-- 샘플 페이지 데이터 (소개 섹션)
INSERT INTO pages (slug, title, content, category, sort_order) VALUES
  ('greeting', '원장 인사말', '<h2>안녕하세요, 자람동산어린이집입니다.</h2><p>우리 어린이집은 아이들이 건강하고 행복하게 자랄 수 있도록 최선을 다하고 있습니다.</p>', 'about', 1),
  ('philosophy', '교육이념 및 원훈', '<h2>교육이념</h2><p>자연과 함께하는 유아교육</p><h3>원훈</h3><ul><li>건강한 아이</li><li>창의적인 아이</li><li>배려하는 아이</li></ul>', 'about', 2),
  ('environment', '교육환경', '<h2>쾌적한 교육 환경</h2><p>아이들이 안전하고 편안하게 생활할 수 있는 공간을 제공합니다.</p>', 'about', 4),
  ('facilities', '시설현황', '<h2>주요 시설</h2><ul><li>각 반 교실</li><li>놀이터</li><li>급식실</li><li>강당</li></ul>', 'about', 5),
  ('location', '오시는길', '<h2>찾아오시는 길</h2><p>주소: 서울특별시 강남구 테헤란로 123</p>', 'about', 6);

-- 샘플 페이지 데이터 (보육과정 섹션)
INSERT INTO pages (slug, title, content, category, sort_order) VALUES
  ('standard', '표준보육과정', '<h2>표준보육과정</h2><p>영유아의 전인적 발달을 도모하는 국가 수준의 보육과정입니다.</p>', 'curriculum', 1),
  ('nuri', '누리과정', '<h2>누리과정</h2><p>만 3~5세 유아를 위한 공통 교육·보육과정입니다.</p>', 'curriculum', 2),
  ('nature', '자연주의 유아교육 프로그램', '<h2>자연주의 유아교육</h2><p>자연과 함께하는 체험 중심 교육을 실시합니다.</p>', 'curriculum', 3),
  ('forest', '숲유치원 프로그램', '<h2>숲유치원</h2><p>숲에서 배우고 성장하는 생태 교육 프로그램입니다.</p>', 'curriculum', 4);

-- 샘플 교직원 데이터
INSERT INTO teachers (name, position, class_name, introduction, sort_order, is_active) VALUES
  ('김원장', '원장', NULL, '자람동산어린이집에 오신 것을 환영합니다.', 1, true),
  ('이부장', '부장교사', '햇님반', '20년 경력의 베테랑 교사입니다.', 2, true),
  ('박선생', '담임교사', '달님반', '아이들과 함께 성장하는 교사입니다.', 3, true),
  ('최선생', '담임교사', '별님반', '창의적인 교육을 지향합니다.', 4, true);

-- 샘플 공지사항
INSERT INTO posts (board_type, title, content, author_id, is_pinned, is_published) VALUES
  ('notice', '2025년 신입생 모집 안내', '<p>2025년 신입생을 모집합니다.</p><p>상담 문의: 02-1234-5678</p>', NULL, true, true),
  ('notice', '겨울방학 운영 안내', '<p>겨울방학 기간 운영 시간을 안내드립니다.</p>', NULL, false, true);

-- 샘플 가정통신문
INSERT INTO posts (board_type, title, content, author_id, is_pinned, is_published) VALUES
  ('newsletter', '2월 가정통신문', '<p>2월 한 달간의 교육 계획을 안내드립니다.</p>', NULL, false, true);

-- 샘플 배너
INSERT INTO banners (title, image_url, link_url, sort_order, is_active) VALUES
  ('메인 배너 1', '/images/banner1.jpg', NULL, 1, true),
  ('메인 배너 2', '/images/banner2.jpg', NULL, 2, true);
