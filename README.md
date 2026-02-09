# 자람동산어린이집 웹사이트

자람동산어린이집 웹사이트 클론 프로젝트입니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **백엔드/DB**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **배포**: Vercel

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-key
```

### 2. 데이터베이스 마이그레이션

Supabase 대시보드의 SQL Editor에서 다음 파일들을 순서대로 실행하세요:

1. `supabase/migrations/20240101000000_init_schema.sql`
2. `supabase/migrations/20240101000001_rls_policies.sql`
3. `supabase/migrations/20240101000002_seed_data.sql`

### 3. 의존성 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
├── app/                    # Next.js App Router 페이지
├── components/             # 재사용 가능한 컴포넌트
│   ├── ui/                # UI 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── board/             # 게시판 컴포넌트
│   ├── album/             # 앨범 컴포넌트
│   ├── editor/            # 에디터 컴포넌트
│   └── admin/             # 관리자 컴포넌트
├── lib/                    # 유틸리티 및 라이브러리
│   ├── supabase/          # Supabase 클라이언트
│   ├── utils.ts           # 유틸리티 함수
│   └── constants.ts       # 상수 정의
├── types/                  # TypeScript 타입 정의
├── supabase/               # Supabase 마이그레이션
└── public/                 # 정적 파일
```

## 개발 가이드

자세한 개발 가이드는 `CLAUDE.md` 파일을 참조하세요.

## Phase 1 완료 항목 ✅

- [x] Next.js + TypeScript + Tailwind 프로젝트 생성
- [x] Supabase 클라이언트 설정
- [x] 데이터베이스 스키마 마이그레이션 SQL 생성
- [x] RLS 정책 SQL 생성
- [x] 기본 시드 데이터 SQL 생성
- [x] 기본 폴더 구조 생성

## Phase 2 완료 항목 ✅

- [x] 공통 레이아웃 구현 (Header with 메가메뉴, Footer)
- [x] 모바일 반응형 네비게이션 (햄버거 메뉴)
- [x] 메인 페이지 구현 (배너, 공지사항, 앨범, 바로가기)
- [x] 소개 페이지 구현 (인사말, 교육이념, 교직원, 교육환경, 시설현황)
- [x] 오시는길 페이지 (카카오맵 연동)
- [x] 보육과정 페이지 구현 (표준보육과정, 누리과정, 자연주의, 숲유치원)

## Phase 3 완료 항목 ✅

- [x] 공지사항 게시판 (목록/상세, 페이지네이션, 고정글)
- [x] 가정통신문 게시판 (목록/상세, 첨부파일)
- [x] 앨범/갤러리 시스템 (목록/상세, 사진 그리드)
- [x] 식단표 페이지 (월별 캘린더)
- [x] 문의하기 폼 (유효성 검사)
- [x] 페이지네이션 컴포넌트
- [x] Input/Textarea 컴포넌트

## Phase 4 완료 항목 ✅

- [x] 로그인 페이지 구현
- [x] 관리자 레이아웃 (사이드바 네비게이션)
- [x] 관리자 대시보드 (통계, 최근 글, 최근 문의)
- [x] 게시글 관리 (공지사항, 가정통신문 목록)
- [x] 페이지 콘텐츠 관리 (소개/보육과정 페이지 목록)
- [x] 앨범 관리 (앨범 목록, 상태 표시)
- [x] 교직원 관리 (목록, 정보 표시)
- [x] 문의 관리 (목록, 통계, 상태별 필터)
- [x] 사이트 설정 (기본 정보, 연락처, 운영 시간, 지도 설정)

## 완료된 기능 요약 🎯

### 공개 페이지
- ✅ 메인 페이지 (히어로, 바로가기, 공지사항, 앨범)
- ✅ 소개 (인사말, 교육이념, 교직원, 교육환경, 시설현황, 오시는길)
- ✅ 보육과정 (표준보육, 누리과정, 자연주의, 숲유치원)
- ✅ 게시판 (공지사항, 가정통신문, 앨범, 식단표)
- ✅ 커뮤니티 (문의하기)

### 관리자 페이지
- ✅ 대시보드
- ✅ 게시글 관리
- ✅ 페이지 관리
- ✅ 앨범 관리
- ✅ 교직원 관리
- ✅ 문의 관리
- ✅ 사이트 설정

## 다음 단계 (선택사항)

실제 운영을 위해 추가할 기능:
- [ ] WYSIWYG 에디터 연동 (TipTap 또는 React-Quill)
- [ ] 이미지 업로드 기능 (Supabase Storage)
- [ ] 게시글/앨범/교직원 생성/수정 페이지
- [ ] 실제 Supabase Auth 로그인 연동
- [ ] 파일 첨부 기능
- [ ] 검색 기능
