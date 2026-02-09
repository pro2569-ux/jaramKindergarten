-- RLS(Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles 테이블 정책
-- ============================================================

-- 모든 사용자는 자신의 프로필 읽기 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필 업데이트 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- admin은 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- admin은 모든 프로필 관리 가능
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- pages 테이블 정책
-- ============================================================

-- 누구나 공개된 페이지 읽기 가능
CREATE POLICY "Anyone can read published pages"
  ON pages FOR SELECT
  USING (is_published = true);

-- admin과 teacher는 모든 페이지 읽기 가능
CREATE POLICY "Staff can read all pages"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- admin만 페이지 관리 가능
CREATE POLICY "Admins can manage pages"
  ON pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- posts 테이블 정책
-- ============================================================

-- 누구나 공개된 게시글 읽기 가능
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (is_published = true);

-- teacher는 자신의 게시글 CRUD
CREATE POLICY "Teachers can manage own posts"
  ON posts FOR ALL
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- admin은 모든 게시글 관리 가능
CREATE POLICY "Admins can manage all posts"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- albums 테이블 정책
-- ============================================================

-- 누구나 공개된 앨범 읽기 가능
CREATE POLICY "Anyone can read published albums"
  ON albums FOR SELECT
  USING (is_published = true);

-- teacher는 자신의 앨범 관리
CREATE POLICY "Teachers can manage own albums"
  ON albums FOR ALL
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- admin은 모든 앨범 관리
CREATE POLICY "Admins can manage all albums"
  ON albums FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- album_photos 테이블 정책
-- ============================================================

-- 누구나 공개된 앨범의 사진 읽기 가능
CREATE POLICY "Anyone can read photos from published albums"
  ON album_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id AND albums.is_published = true
    )
  );

-- teacher는 자신의 앨범 사진 관리
CREATE POLICY "Teachers can manage own album photos"
  ON album_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_photos.album_id
        AND albums.author_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    )
  );

-- admin은 모든 앨범 사진 관리
CREATE POLICY "Admins can manage all album photos"
  ON album_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- meal_plans 테이블 정책
-- ============================================================

-- 누구나 식단표 읽기 가능
CREATE POLICY "Anyone can read meal plans"
  ON meal_plans FOR SELECT
  USING (true);

-- admin과 teacher는 식단표 관리 가능
CREATE POLICY "Staff can manage meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- ============================================================
-- teachers 테이블 정책
-- ============================================================

-- 누구나 활성 교직원 정보 읽기 가능
CREATE POLICY "Anyone can read active teachers"
  ON teachers FOR SELECT
  USING (is_active = true);

-- admin은 모든 교직원 정보 관리 가능
CREATE POLICY "Admins can manage teachers"
  ON teachers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- inquiries 테이블 정책
-- ============================================================

-- 로그인한 사용자는 자신의 문의 읽기 가능
CREATE POLICY "Users can read own inquiries"
  ON inquiries FOR SELECT
  USING (
    auth.uid()::text = author_email
    OR NOT is_private
  );

-- 누구나 문의 작성 가능
CREATE POLICY "Anyone can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (true);

-- admin과 teacher는 모든 문의 읽기 가능
CREATE POLICY "Staff can read all inquiries"
  ON inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- admin과 teacher는 문의 답변 가능 (UPDATE만)
CREATE POLICY "Staff can reply to inquiries"
  ON inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- admin은 문의 삭제 가능
CREATE POLICY "Admins can delete inquiries"
  ON inquiries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- site_settings 테이블 정책
-- ============================================================

-- 누구나 사이트 설정 읽기 가능
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

-- admin만 사이트 설정 관리 가능
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- banners 테이블 정책
-- ============================================================

-- 누구나 활성 배너 읽기 가능
CREATE POLICY "Anyone can read active banners"
  ON banners FOR SELECT
  USING (is_active = true);

-- admin은 모든 배너 읽기 가능
CREATE POLICY "Admins can read all banners"
  ON banners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- admin은 배너 관리 가능
CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
