# 자람동산 어드민 레이아웃 관리 시스템 개발 가이드

## 🎯 목표
어드민에서 **상단 메뉴 구조(대분류/소분류)**, **각 페이지 타입과 레이아웃**, **색상/폰트 스타일**까지 모두 관리할 수 있는 미니 CMS 구축.

## 📐 아키텍처 개요

```
[DB] menus → [DB] pages (타입+레이아웃+스타일) → [공개 페이지] 동적 렌더링
   ↑              ↑
   └──────────────┴── 어드민에서 전부 관리
```

핵심: **페이지 타입을 7개로 정의**하고, 각 타입마다 레이아웃 옵션과 스타일 옵션을 DB에 저장. 공개 페이지는 catch-all 라우트(`app/(public)/[...slug]/page.tsx`)로 동적 렌더링.

---

## 🗄️ Phase 1: DB 스키마 확장

### 1-1. 기존 테이블 확장 및 신규 테이블 생성

새 마이그레이션 파일: `supabase/migrations/20250412000000_layout_system.sql`

```sql
-- ============================================
-- 1. menus 테이블 (상단 메뉴 동적 관리)
-- ============================================
CREATE TABLE menus (
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

CREATE INDEX idx_menus_parent ON menus(parent_id);
CREATE INDEX idx_menus_sort ON menus(sort_order);

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
CREATE TABLE site_theme (
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
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_theme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible menus"
  ON menus FOR SELECT USING (is_visible = true);

CREATE POLICY "Admins manage menus"
  ON menus FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can read active theme"
  ON site_theme FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage themes"
  ON site_theme FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 5. 기존 메뉴 데이터 시드 (menu-items.ts 기반)
-- ============================================
-- 대분류
INSERT INTO menus (id, label, slug, depth, sort_order) VALUES
  (gen_random_uuid(), '어린이집소개', 'about', 0, 1),
  (gen_random_uuid(), '교육프로그램', 'curriculum', 0, 2),
  (gen_random_uuid(), '입학안내', 'admission', 0, 3),
  (gen_random_uuid(), '교육활동이야기', 'board', 0, 4),
  (gen_random_uuid(), '커뮤니티', 'community', 0, 5);
-- 소분류는 어드민에서 추가하거나 별도 시드 작성
```

---

## 🎨 Phase 2: 페이지 타입 정의

### 2-1. 페이지 타입 상수 파일 생성
**새 파일**: `lib/page-types.ts`

```typescript
export const PAGE_TYPES = {
  single: {
    label: '단일 페이지',
    description: '인사말, 교육이념처럼 하나의 글을 보여주는 페이지',
    icon: 'FileText',
    layoutOptions: {
      width: ['narrow', 'medium', 'wide'],
      showTOC: [true, false],
    },
    example: '원장 인사말, 교육이념, 교육환경',
  },
  list: {
    label: '리스트 게시판',
    description: '제목/날짜 중심의 게시글 목록',
    icon: 'List',
    layoutOptions: {
      columns: [1, 2],
      showThumbnail: [true, false],
      pageSize: [10, 15, 20],
    },
    example: '공지사항, 가정통신문',
  },
  gallery: {
    label: '갤러리',
    description: '사진 중심의 앨범 목록',
    icon: 'Image',
    layoutOptions: {
      columns: [2, 3, 4],
      aspectRatio: ['square', 'video', 'auto'],
      gap: ['sm', 'md', 'lg'],
    },
    example: '사진첩, 활동 앨범',
  },
  pdf_list: {
    label: 'PDF 목록',
    description: 'PDF 파일을 다운로드/미리보기 가능한 목록',
    icon: 'FileText',
    layoutOptions: {
      sortBy: ['date', 'name'],
      showPreview: [true, false],
    },
    example: '식단표, 모집요강, 가정통신문(PDF형)',
  },
  card_grid: {
    label: '카드 그리드',
    description: '이미지+텍스트 카드 형태 (교직원, 특색활동 등)',
    icon: 'Grid',
    layoutOptions: {
      columns: [2, 3, 4],
      cardStyle: ['bordered', 'shadow', 'flat'],
    },
    example: '교직원 소개, 특색활동, 시설 소개',
  },
  faq: {
    label: 'Q&A',
    description: '자주 묻는 질문 아코디언',
    icon: 'HelpCircle',
    layoutOptions: {
      expandStyle: ['single', 'multiple'],
    },
    example: '입학 FAQ, 자주 묻는 질문',
  },
  timeline: {
    label: '타임라인',
    description: '연혁이나 일정을 시간순으로 표시',
    icon: 'Clock',
    layoutOptions: {
      direction: ['vertical', 'horizontal'],
    },
    example: '어린이집 연혁, 연간 일정',
  },
} as const;

export type PageType = keyof typeof PAGE_TYPES;
```

### 2-2. 각 타입별 렌더러 컴포넌트 생성
**새 디렉토리**: `components/page-renderers/`

생성할 파일:
- `SinglePageRenderer.tsx` — 리치 텍스트 콘텐츠 렌더링 + TOC 옵션
- `ListBoardRenderer.tsx` — posts 테이블 조회 + 페이지네이션
- `GalleryRenderer.tsx` — albums 테이블 조회 + 그리드
- `PdfListRenderer.tsx` — Storage에서 PDF 목록 + 다운로드/미리보기
- `CardGridRenderer.tsx` — 카드형 아이템 그리드
- `FaqRenderer.tsx` — 아코디언 (details/summary 또는 커스텀)
- `TimelineRenderer.tsx` — 세로/가로 타임라인

공통 props:
```typescript
interface RendererProps {
  page: Page;                    // pages 테이블 데이터
  layoutConfig: Record<string, any>;
  styleConfig: Record<string, any>;
}
```

---

## 🛠️ Phase 3: 어드민 페이지 개발

### 3-1. 메뉴 관리 페이지
**새 파일**: `app/admin/menus/page.tsx`

**기능**:
- 2단 트리 구조로 메뉴 표시 (대분류 → 소분류)
- 대분류 추가/수정/삭제 (label, slug, sort_order)
- 각 대분류 아래 소분류 추가/수정/삭제
- 드래그로 순서 변경 (dnd-kit 사용 권장, 없으면 ▲▼ 버튼)
- 소분류 생성 시 page_type 선택 → pages 테이블에 레코드 자동 생성 → page_id 연결
- is_visible 토글로 공개/비공개

**UI 레이아웃**:
```
[대분류 추가 버튼]
┌─ 어린이집소개 (about)  [편집] [삭제] [▲▼]
│  ├─ 원장 인사말  (single)   [편집] [삭제]
│  ├─ 교육이념    (single)   [편집] [삭제]
│  └─ [+ 소분류 추가]
├─ 교육프로그램 (curriculum)
│  └─ ...
```

### 3-2. 페이지 편집기 (타입별 분기)
**새 파일**: `app/admin/pages/[id]/edit/page.tsx`

**기능**:
- 상단: 페이지 기본 정보 (제목, 설명, hero 이미지/타이틀)
- 중단: **페이지 타입 선택** 드롭다운 (변경 시 layout_config 리셋)
- 레이아웃 탭: 선택한 타입의 `layoutOptions`를 UI로 노출 (드롭다운/토글)
- 스타일 탭: 색상 피커, 폰트 선택, 간격 조절
- 콘텐츠 탭: 타입별로 다른 에디터
  - `single`: RichTextEditor 풀화면
  - `list`: 연결된 게시글 목록 (posts 테이블과 연동)
  - `gallery`: 앨범 목록 관리
  - `pdf_list`: PDF 업로드 + 목록
  - `card_grid`: 카드 아이템 CRUD (별도 items JSONB 필드)
  - `faq`: Q&A 아이템 CRUD
  - `timeline`: 타임라인 아이템 CRUD
- 우측: **실시간 미리보기** iframe (옵션, Phase 2)

### 3-3. 테마 설정 페이지
**새 파일**: `app/admin/theme/page.tsx`

**기능**:
- 색상 피커: primary, secondary, background, text
- 폰트 선택: Pretendard, 나눔고딕, Noto Serif KR 등 3~5개 프리셋
- 헤더 스타일: default/centered/minimal
- 미리보기 섹션 (버튼, 카드, 텍스트 샘플)
- 저장 시 site_theme 테이블 업데이트 + is_active=true 갱신

---

## 🌐 Phase 4: 공개 페이지 동적 렌더링

### 4-1. Catch-all 라우트 생성
**새 파일**: `app/(public)/[...slug]/page.tsx`

**로직**:
1. URL의 slug 배열로 menus 테이블 조회
   - `/about/greeting` → parent slug='about', child slug='greeting'
2. 연결된 `page_id`로 pages 테이블 조회
3. `page_type`에 따라 해당 렌더러 컴포넌트 import 후 렌더링
4. `style_config`를 CSS 변수로 주입 (스코프 제한)
5. 404: 메뉴 없으면 notFound() 호출

```typescript
// 의사 코드
export default async function DynamicPage({ params }) {
  const { slug } = await params;
  const [parentSlug, childSlug] = slug;
  
  const supabase = await createClient();
  const menu = await fetchMenuBySlug(parentSlug, childSlug);
  if (!menu?.page_id) notFound();
  
  const page = await fetchPage(menu.page_id);
  const Renderer = getRendererByType(page.page_type);
  
  return (
    <div style={getStyleVars(page.style_config)}>
      <Hero page={page} />
      <Renderer page={page} 
                layoutConfig={page.layout_config}
                styleConfig={page.style_config} />
    </div>
  );
}
```

### 4-2. 기존 정적 페이지 마이그레이션
**삭제 대상** (동적 라우트가 대체):
- `app/(public)/about/**/*`
- `app/(public)/curriculum/**/*`

**유지 대상** (특수 로직 있음):
- `app/(public)/board/album/*` (앨범 상세는 별도 유지)
- `app/(public)/board/notice/[id]/*` (게시글 상세)
- `app/(public)/community/inquiry/*` (문의하기 폼)

**주의**: 기존 데이터(`pages` 테이블의 seed 데이터)를 menus에 연결하는 마이그레이션 스크립트 필요.

### 4-3. Header 컴포넌트 수정
**파일**: `components/layout/Header.tsx`

- 기존 `menu-items.ts` import 제거
- 서버 컴포넌트로 변경하여 menus 테이블에서 조회
- 또는 `generateStaticParams`로 빌드 시 생성 후 revalidate 활용
- ISR 권장: `export const revalidate = 60`

---

## ⚠️ 주의사항 및 권장사항

1. **기존 데이터 보존**: 기존 `app/(public)/about/greeting/page.tsx` 등의 하드코딩 콘텐츠를 migration 스크립트로 pages 테이블에 자동 이관.

2. **점진적 전환**: 한 번에 다 바꾸지 말고 Phase 1~2 먼저 완성 → 새 페이지 한두 개 테스트 → Phase 3~4 진행.

3. **SEO**: 동적 라우트도 `generateMetadata` 구현 필수. pages 테이블의 title/description 활용.

4. **캐싱**: menus와 pages는 ISR(`revalidate: 60`) 또는 `revalidateTag` 사용으로 성능 확보.

5. **style_config 스코프**: CSS 변수 주입 시 전역 오염 방지를 위해 페이지 루트 div에 스코프 제한.

6. **드래그 정렬**: `npm install @dnd-kit/core @dnd-kit/sortable` 후 사용. 복잡하면 ▲▼ 버튼으로 우선 구현.

7. **백업**: 마이그레이션 전 Supabase에서 데이터 백업 필수.

---

## 📦 설치 필요 패키지

```bash
npm install @dnd-kit/core @dnd-kit/sortable
npm install react-colorful  # 색상 피커
npm install react-hot-toast  # 알림
```

---

## ✅ 작업 순서 요약

1. **Phase 1**: 마이그레이션 실행 → menus, 확장된 pages, site_theme 생성
2. **Phase 2**: `lib/page-types.ts` + 7개 렌더러 컴포넌트 뼈대 생성
3. **Phase 3-1**: 메뉴 관리 페이지 (`/admin/menus`)
4. **Phase 3-2**: 페이지 편집기 (`/admin/pages/[id]/edit`) — 타입별 분기
5. **Phase 3-3**: 테마 설정 (`/admin/theme`)
6. **Phase 4-1**: catch-all 동적 라우트
7. **Phase 4-2**: 기존 정적 페이지 데이터 이관 + 삭제
8. **Phase 4-3**: Header를 DB 기반으로 전환

각 Phase 완료 후 테스트하고 다음으로 진행. Phase 1~2만 끝내도 기반 작업이 된 거라 이후 작업이 수월해짐.
