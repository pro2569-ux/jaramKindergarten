# 자람동산어린이집 클론 프로젝트 (CLAUDE.md)

## 📌 프로젝트 개요

**jaramk.com (자람동산어린이집)** 웹사이트를 참고하여, 어린이집/유치원용 CMS 웹사이트를 처음부터 새로 구축하는 프로젝트입니다.

- 원본 사이트: http://jaramk.com
- 원본 관리자 페이지: http://admin.jaramk.com
- 원본은 PHP/JSP 기반 전통적 CMS이며, 우리는 모던 스택으로 재구축합니다.

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14+ (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| 에디터 | TipTap 또는 React-Quill (WYSIWYG) |
| 지도 | 카카오맵 API |
| 배포 | Vercel |
| 패키지매니저 | pnpm 권장 |

---

## 📁 폴더 구조

```
src/
├── app/
│   ├── (public)/              # 공개 페이지 레이아웃
│   │   ├── page.tsx           # 메인 페이지
│   │   ├── about/
│   │   │   ├── greeting/      # 인사말
│   │   │   ├── philosophy/    # 교육이념/원훈
│   │   │   ├── teachers/      # 교원/반편성
│   │   │   ├── environment/   # 교육환경
│   │   │   ├── facilities/    # 시설현황
│   │   │   └── location/      # 오시는길 (카카오맵)
│   │   ├── curriculum/
│   │   │   ├── standard/      # 표준보육과정
│   │   │   ├── nuri/          # 누리과정
│   │   │   ├── nature/        # 자연주의 유아교육 프로그램
│   │   │   └── forest/        # 숲유치원 프로그램
│   │   ├── board/
│   │   │   ├── notice/        # 공지사항 (목록/상세)
│   │   │   ├── newsletter/    # 가정통신문
│   │   │   ├── meal-plan/     # 식단표
│   │   │   └── album/         # 앨범/갤러리
│   │   └── community/
│   │       └── inquiry/       # 문의하기
│   │
│   ├── (auth)/                # 로그인 (관리자 전용 — 회원가입 없음)
│   │   └── login/
│   │
│   ├── admin/                 # 관리자 페이지 (보호된 라우트)
│   │   ├── layout.tsx         # 관리자 레이아웃 (사이드바)
│   │   ├── page.tsx           # 대시보드
│   │   ├── pages/             # 정적 페이지 콘텐츠 관리
│   │   ├── posts/             # 게시판 관리
│   │   ├── albums/            # 앨범 관리
│   │   ├── meal-plans/        # 식단표 관리
│   │   ├── teachers/          # 교직원 관리
│   │   ├── inquiries/         # 문의 관리
│   │   ├── users/             # 사용자/권한 관리
│   │   └── settings/          # 사이트 설정
│   │
│   ├── api/                   # API Route Handlers (필요시)
│   └── layout.tsx             # 루트 레이아웃
│
├── components/
│   ├── ui/                    # 공통 UI 컴포넌트 (Button, Card, Modal 등)
│   ├── layout/                # Header, Footer, Navigation, Sidebar
│   ├── board/                 # 게시판 관련 컴포넌트
│   ├── album/                 # 앨범/갤러리 컴포넌트
│   ├── editor/                # WYSIWYG 에디터 컴포넌트
│   └── admin/                 # 관리자 전용 컴포넌트
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # 브라우저 Supabase 클라이언트
│   │   ├── server.ts          # 서버 Supabase 클라이언트
│   │   └── middleware.ts      # Auth 미들웨어
│   ├── utils.ts               # 유틸 함수
│   └── constants.ts           # 상수 정의
│
├── hooks/                     # 커스텀 훅
├── types/                     # TypeScript 타입 정의
└── styles/                    # 글로벌 스타일
```

---

## 🗄️ 데이터베이스 스키마 (Supabase)

### profiles (사용자 프로필)
```sql
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
```

### pages (정적 페이지 콘텐츠 - CMS)
```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- 예: 'greeting', 'philosophy', 'environment'
  title TEXT NOT NULL,
  content TEXT,                      -- HTML 콘텐츠 (WYSIWYG 에디터)
  category TEXT NOT NULL,            -- 'about', 'curriculum'
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### posts (게시판)
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_type TEXT NOT NULL CHECK (board_type IN ('notice', 'newsletter', 'free')),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  attachment_urls TEXT[],            -- 첨부파일 URL 배열
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### albums (앨범/갤러리)
```sql
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  author_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT true,
  event_date DATE,                   -- 행사 날짜
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### album_photos (앨범 사진)
```sql
CREATE TABLE album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### meal_plans (식단표)
```sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL,
  week INT,                          -- NULL이면 월간 식단
  title TEXT,
  file_url TEXT,                     -- PDF 또는 이미지 파일
  content JSONB,                     -- 또는 구조화된 식단 데이터
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month, week)
);
```

### teachers (교직원 정보)
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,            -- 원장, 부장교사, 담임교사 등
  class_name TEXT,                   -- 담당 반 (햇님반, 달님반 등)
  photo_url TEXT,
  introduction TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### inquiries (문의하기)
```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_phone TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reply TEXT,                        -- 관리자 답변
  replied_at TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### site_settings (사이트 설정)
```sql
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,          -- 'site_name', 'logo_url', 'phone', 'address' 등
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### banners (메인 배너/슬라이드)
```sql
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 권한(RLS) 정책

### 역할 정의
- **admin**: 모든 테이블 CRUD + 사용자 관리 + 사이트 설정
- **teacher**: posts, albums, album_photos, meal_plans CRUD (자기 글) + 읽기 전체
- **parent**: 공개 콘텐츠 읽기 + inquiries 작성
- **비로그인(public)**: 공개 콘텐츠 읽기만

### RLS 정책 기본 패턴
```sql
-- 예시: posts 테이블
-- 누구나 published 된 글 읽기 가능
CREATE POLICY "Public can read published posts"
  ON posts FOR SELECT
  USING (is_published = true);

-- teacher는 자기 글 CRUD
CREATE POLICY "Teachers can manage own posts"
  ON posts FOR ALL
  USING (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- admin은 모든 글 CRUD
CREATE POLICY "Admins can manage all posts"
  ON posts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 🎨 디자인 가이드라인

### 컬러 팔레트 (어린이집 느낌)
- **Primary**: 초록 계열 (#4CAF50 또는 커스텀) - 자연/숲 느낌
- **Secondary**: 따뜻한 노랑/오렌지 (#FF9800)
- **Accent**: 하늘색 (#03A9F4)
- **Background**: 밝은 크림/아이보리 (#FFF8E1 또는 #FAFAFA)
- **Text**: 부드러운 다크그레이 (#333333)

### 디자인 방향
- 한국 어린이집 홈페이지 특유의 따뜻하고 친근한 느낌
- 둥근 모서리, 부드러운 그림자
- 아이콘은 귀엽고 직관적으로
- 모바일 퍼스트 (학부모 90%가 모바일 접속)
- 폰트: 'Pretendard' 또는 'Noto Sans KR'

---

## 📋 작업 순서 (Phase별)

### Phase 1: 프로젝트 초기화 + DB (Day 1-2)
- [ ] Next.js + TypeScript + Tailwind 프로젝트 생성
- [ ] Supabase 프로젝트 연결
- [ ] 위의 모든 테이블 마이그레이션 SQL 생성 및 실행
- [ ] RLS 정책 설정
- [ ] Supabase Auth 설정 (이메일 로그인)
- [ ] 기본 시드 데이터 삽입 (site_settings, 샘플 pages)

### Phase 2: 레이아웃 + 공개 페이지 (Day 3-5)
- [ ] 공통 레이아웃 (Header with 메가메뉴, Footer)
- [ ] 모바일 반응형 네비게이션 (햄버거 메뉴)
- [ ] 메인 페이지 (배너 슬라이더, 공지 미리보기, 갤러리 미리보기, 바로가기)
- [ ] 소개 페이지들 (DB에서 콘텐츠 불러오기)
- [ ] 오시는길 페이지 (카카오맵 연동)
- [ ] 보육과정 페이지들

### Phase 3: 게시판 + 갤러리 시스템 (Day 6-8)
- [ ] 공지사항 목록/상세 페이지
- [ ] 가정통신문 목록/상세
- [ ] 앨범/갤러리 (썸네일 그리드 → 상세 라이트박스)
- [ ] 식단표 (캘린더형 또는 목록형, PDF 뷰어)
- [ ] 문의하기 폼 + 목록
- [ ] 페이지네이션 컴포넌트

### Phase 4: 관리자 페이지 (Day 9-12)
- [ ] 관리자 로그인 + 권한 체크 미들웨어
- [ ] 관리자 레이아웃 (사이드바 네비게이션)
- [ ] 대시보드 (최근 글, 문의, 통계)
- [ ] 페이지 콘텐츠 관리 (WYSIWYG 에디터로 편집)
- [ ] 게시판 CRUD (공지사항, 가정통신문)
- [ ] 앨범 관리 (생성, 사진 업로드, 삭제)
- [ ] 식단표 관리 (파일 업로드)
- [ ] 교직원 관리
- [ ] 문의 답변 관리
- [ ] 배너 관리
- [ ] 사이트 설정 관리 (로고, 연락처, 주소 등)
- [ ] 사용자/권한 관리

### Phase 5: 마무리 (Day 13-14)
- [ ] SEO (메타태그, OG 태그)
- [ ] 반응형 전체 점검
- [ ] 에러 페이지 (404, 500)
- [ ] 로딩 상태, 스켈레톤 UI
- [ ] Vercel 배포
- [ ] 도메인 연결

---

## ⚠️ 주의사항 / 코딩 컨벤션

1. **컴포넌트**: 함수형 컴포넌트 + TypeScript 타입 필수
2. **네이밍**: 파일명 kebab-case, 컴포넌트명 PascalCase
3. **상태관리**: 서버 컴포넌트 우선, 클라이언트 상태는 최소화
4. **데이터 페칭**: Server Components에서 Supabase 직접 호출 우선
5. **이미지**: Supabase Storage에 업로드, Next.js Image 컴포넌트 사용
6. **에러 처리**: try-catch 필수, 사용자 친화적 에러 메시지
7. **한국어**: 모든 UI 텍스트는 한국어
8. **접근성**: 시맨틱 HTML, alt 텍스트, 키보드 네비게이션

---

## 🔗 참고 자료

- 원본 사이트: http://jaramk.com
- Supabase 문서: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- Tailwind CSS: https://tailwindcss.com/docs
- 카카오맵 API: https://apis.map.kakao.com
