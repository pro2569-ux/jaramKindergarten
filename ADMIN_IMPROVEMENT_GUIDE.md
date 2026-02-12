# 자람동산 어린이집 어드민 개선 작업 가이드

## 프로젝트 개요

- **프레임워크**: Next.js 16 + React 19 + TypeScript
- **백엔드**: Supabase (Auth + DB + Storage + RLS)
- **에디터**: TipTap (리치 텍스트)
- **스타일링**: Tailwind CSS v4
- **배포**: Vercel

---

## 🚨 Phase 1: 핵심 CRUD 완성 (최우선)

### 1-1. 게시글 작성 기능 완성

- **파일**: `app/admin/posts/create/page.tsx`
- **문제**: Supabase 저장이 TODO 주석으로만 남아있음 (line 43~50)
- **작업**:
  - `@/lib/supabase/client`에서 `createClient` import
  - `handleSubmit`에서 실제 `supabase.from('posts').insert()` 구현
  - `author_id`는 `supabase.auth.getUser()`로 가져오기
  - 성공 시 `router.push('/admin/posts?type=' + boardType)`
  - 에러 시 alert 또는 toast 표시

### 1-2. 게시글 수정 기능 완성

- **파일**: `app/admin/posts/[id]/edit/page.tsx`
- **작업**:
  - 기존 데이터 로드: `supabase.from('posts').select().eq('id', params.id).single()`
  - 수정 저장: `supabase.from('posts').update({...}).eq('id', params.id)`
  - `RichTextEditor` 컴포넌트 활용하여 content 편집

### 1-3. 게시글 삭제 기능 구현

- **파일**: `app/admin/posts/page.tsx`
- **문제**: 삭제 버튼 UI만 있고 로직 없음
- **작업**:
  - 삭제 확인 모달 또는 confirm 추가
  - `supabase.from('posts').delete().eq('id', postId)` 구현
  - 삭제 후 목록 새로고침 (`router.refresh()`)

### 1-4. 이미지 업로드 → Supabase Storage 연동

- **파일**: `components/ui/ImageUpload.tsx`
- **문제**: 현재 base64 로컬 미리보기만 동작, Storage 업로드가 TODO
- **작업**:
  - `createClient`로 Supabase 클라이언트 생성
  - `supabase.storage.from('images').upload(filePath, file)` 구현
  - 파일명: `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}` 형식으로 중복 방지
  - 업로드 후 `getPublicUrl()`로 public URL 획득하여 `onChange(publicUrl)` 호출
  - Supabase 대시보드에서 `images` 버킷이 생성되어 있어야 함 (public 버킷)

### 1-5. RichTextEditor 이미지 삽입 개선

- **파일**: `components/editor/RichTextEditor.tsx`
- **문제**: `addImage`가 `window.prompt`로 URL 직접 입력 방식
- **작업**:
  - 파일 input을 동적 생성하여 파일 선택 방식으로 변경
  - 선택한 파일을 Supabase Storage에 업로드
  - 업로드된 publicUrl을 `editor.chain().focus().setImage({ src: publicUrl }).run()`으로 삽입

### 1-6. admin 미들웨어에 role 체크 추가

- **파일**: `lib/supabase/middleware.ts`
- **문제**: 로그인 여부만 체크하고, admin/teacher role 확인 안 함 (parent도 /admin 접근 가능)
- **작업**:
  - `/admin` 경로 접근 시 user가 있으면 `profiles` 테이블에서 role 조회
  - role이 `admin` 또는 `teacher`가 아니면 홈(`/`)으로 리다이렉트
  - 주의: middleware에서 supabase query 시 성능 고려 (매 요청마다 실행됨)

---

## 📦 Phase 2: 누락 페이지 추가

### 2-1. 배너 관리 페이지 생성

- **새 파일**: `app/admin/banners/page.tsx`
- **DB 테이블**: `banners` (이미 존재)
- **필요 기능**:
  - 배너 목록 표시 (이미지 썸네일 + 제목 + 활성 상태)
  - 배너 추가: 이미지 업로드 + 제목 + 링크 URL
  - 활성/비활성 토글 (`is_active` 필드)
  - 순서 변경 (`sort_order` 필드)
  - 삭제

### 2-2. 식단표 관리 페이지 생성

- **새 파일**: `app/admin/meal-plans/page.tsx`
- **DB 테이블**: `meal_plans` (이미 존재)
- **필요 기능**:
  - 연/월 선택 드롭다운
  - 주차별 식단표 이미지 업로드 (`file_url` 필드)
  - 이전 식단표 목록 및 삭제

### 2-3. 페이지 편집기 생성

- **새 파일**: `app/admin/pages/[slug]/edit/page.tsx`
- **DB 테이블**: `pages` (이미 존재)
- **필요 기능**:
  - slug로 페이지 데이터 로드
  - `RichTextEditor`로 content 편집
  - 저장: `supabase.from('pages').update({ content }).eq('slug', slug)`
  - `is_published` 토글

### 2-4. 문의 답변 상세 페이지 생성

- **새 파일**: `app/admin/inquiries/[id]/page.tsx`
- **DB 테이블**: `inquiries` (이미 존재)
- **필요 기능**:
  - 문의 내용 표시 (작성자, 제목, 본문, 작성일)
  - 답변 작성 텍스트에어리어
  - 답변 저장: `update({ reply, replied_at: new Date(), status: 'replied' })`
  - 상태 변경 (대기중 → 답변완료 → 종료)

### 2-5. Sidebar에 새 메뉴 추가

- **파일**: `components/admin/Sidebar.tsx`
- **작업**: navigation 배열에 카테고리 그룹 + 새 메뉴 추가

```typescript
const navigation = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard },

  { type: 'group', name: '콘텐츠 관리' },
  { name: '페이지 관리', href: '/admin/pages', icon: FileText },
  { name: '게시글 관리', href: '/admin/posts', icon: FileText },
  { name: '앨범 관리', href: '/admin/albums', icon: ImageIcon },
  { name: '식단표 관리', href: '/admin/meal-plans', icon: UtensilsCrossed },

  { type: 'group', name: '운영 관리' },
  { name: '교직원 관리', href: '/admin/teachers', icon: Users },
  { name: '문의 관리', href: '/admin/inquiries', icon: MessageSquare },

  { type: 'group', name: '사이트 관리' },
  { name: '배너 관리', href: '/admin/banners', icon: ImageIcon },
  { name: '사이트 설정', href: '/admin/settings', icon: Settings },
]
```

---

## ✨ Phase 3: UX 개선

### 3-1. 토스트 알림 시스템

- `npm install react-hot-toast` 또는 직접 구현
- 저장 성공/실패, 삭제 완료 등에 활용

### 3-2. 삭제 확인 모달 컴포넌트

- 공통 `ConfirmDialog` 컴포넌트 생성
- 게시글, 앨범, 교직원, 배너 삭제 시 공통 사용

### 3-3. 사이트 설정 저장 기능

- **파일**: `app/admin/settings/page.tsx`
- form action 구현 (Server Action 또는 Client-side)
- `supabase.from('site_settings').upsert()` 로 설정 저장

### 3-4. 교직원 추가/수정/삭제

- **파일**: `app/admin/teachers/page.tsx` + 새로 `create/page.tsx`
- 교직원 추가 폼 (이름, 직위, 반, 사진, 소개)
- 수정/삭제 기능

---

## 📌 참고사항

### 현재 DB 스키마 (이미 마이그레이션 완료)

- `profiles`: 사용자 프로필 (admin/teacher/parent)
- `pages`: 정적 페이지 (소개, 보육과정)
- `posts`: 게시판 (notice/newsletter/free)
- `albums` + `album_photos`: 갤러리
- `meal_plans`: 식단표
- `teachers`: 교직원
- `inquiries`: 문의
- `site_settings`: 사이트 설정 (key-value)
- `banners`: 메인 배너

### RLS 정책 요약

- **공개 데이터**: 누구나 읽기 가능 (`is_published=true`)
- **admin**: 모든 테이블 CRUD
- **teacher**: 자기 게시글/앨범 CRUD + 식단표/문의 답변
- **parent**: 공개 데이터 읽기만

### Supabase Storage 버킷 설정 필요

- `images` 버킷 (public) 생성 필요
- 폴더 구조: `uploads/`, `editor/`, `banners/`, `teachers/`, `meals/`

### 기존 컴포넌트 재활용

- `components/ui/Button.tsx` — 공통 버튼
- `components/ui/Card.tsx` — CardContent, CardHeader, CardTitle
- `components/ui/Input.tsx` — 폼 입력
- `components/ui/Textarea.tsx` — 텍스트에어리어
- `components/ui/ImageUpload.tsx` — 이미지 업로드 (Storage 연동 필요)
- `components/ui/Pagination.tsx` — 페이지네이션
- `components/editor/RichTextEditor.tsx`
