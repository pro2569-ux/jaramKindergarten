-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles 테이블 (사용자 프로필)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'teacher', 'parent')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- pages 테이블 (정적 페이지 콘텐츠 - CMS)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- posts 테이블 (게시판)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_type TEXT NOT NULL CHECK (board_type IN ('notice', 'newsletter', 'free')),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  attachment_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- albums 테이블 (앨범/갤러리)
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  author_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT true,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- album_photos 테이블 (앨범 사진)
CREATE TABLE album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- meal_plans 테이블 (식단표)
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL,
  week INT,
  title TEXT,
  file_url TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month, week)
);

-- teachers 테이블 (교직원 정보)
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  class_name TEXT,
  photo_url TEXT,
  introduction TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- inquiries 테이블 (문의하기)
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_phone TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- site_settings 테이블 (사이트 설정)
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- banners 테이블 (메인 배너/슬라이드)
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_posts_board_type ON posts(board_type);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_is_published ON posts(is_published);
CREATE INDEX idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX idx_album_photos_album_id ON album_photos(album_id);
CREATE INDEX idx_meal_plans_year_month ON meal_plans(year, month);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_category ON pages(category);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
