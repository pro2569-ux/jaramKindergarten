# 자람동산어린이집 프로젝트 설정 가이드

완전한 단계별 설정 가이드입니다.

## 📋 목차
1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [데이터베이스 마이그레이션](#3-데이터베이스-마이그레이션)
4. [관리자 계정 생성](#4-관리자-계정-생성)
5. [Storage 설정](#5-storage-설정)
6. [카카오맵 API 키 발급](#6-카카오맵-api-키-발급)

---

## 1. Supabase 프로젝트 생성

### Step 1: 회원가입/로그인
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인

### Step 2: 프로젝트 생성
1. "New project" 클릭
2. Organization 선택 또는 생성
3. 프로젝트 정보 입력:
   - **Name**: `jaram-kindergarten` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 후 **꼭 저장!**
   - **Region**: `Northeast Asia (Seoul)`
   - **Pricing Plan**: `Free`
4. "Create new project" 클릭
5. 프로젝트 생성 완료까지 1-2분 대기

### Step 3: API 키 확인
1. 프로젝트 대시보드에서 좌측 메뉴 "Settings" 클릭
2. "API" 클릭
3. 다음 정보를 복사해서 메모장에 저장:
   - **Project URL**: `https://xxxxx.supabase.co` 형식
   - **anon public key**: `eyJ...` 로 시작하는 긴 문자열

---

## 2. 환경 변수 설정

프로젝트 루트의 `.env.local` 파일을 열고 복사한 값을 입력:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # 여기에 복사한 URL 붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # 여기에 복사한 Key 붙여넣기

# 카카오맵 API 키 (나중에 입력)
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-key
```

저장 후 개발 서버를 재시작하세요:
```bash
# 현재 서버 중지 (Ctrl+C)
# 다시 시작
npm run dev
```

---

## 3. 데이터베이스 마이그레이션

### Step 1: SQL Editor 열기
1. Supabase 대시보드에서 좌측 메뉴 "SQL Editor" 클릭
2. "+ New query" 클릭

### Step 2: 첫 번째 마이그레이션 실행
1. `supabase/migrations/20240101000000_init_schema.sql` 파일을 열기
2. 전체 내용을 복사 (Ctrl+A, Ctrl+C)
3. Supabase SQL Editor에 붙여넣기 (Ctrl+V)
4. 우측 하단 "Run" 버튼 클릭
5. 성공 메시지 확인 ✅

### Step 3: 두 번째 마이그레이션 실행
1. "+ New query" 클릭
2. `supabase/migrations/20240101000001_rls_policies.sql` 파일 내용 복사
3. 붙여넣고 "Run" 클릭
4. 성공 확인 ✅

### Step 4: 세 번째 마이그레이션 실행
1. "+ New query" 클릭
2. `supabase/migrations/20240101000002_seed_data.sql` 파일 내용 복사
3. 붙여넣고 "Run" 클릭
4. 성공 확인 ✅

### Step 5: 테이블 확인
좌측 메뉴 "Table Editor"를 클릭하면 다음 테이블들이 생성된 것을 확인할 수 있습니다:
- profiles
- pages
- posts
- albums
- album_photos
- meal_plans
- teachers
- inquiries
- site_settings
- banners

---

## 4. 관리자 계정 생성

### Step 1: 회원가입
1. Supabase 대시보드에서 "Authentication" 클릭
2. "Add user" > "Create new user" 클릭
3. 정보 입력:
   - **Email**: admin@example.com (원하는 이메일)
   - **Password**: 강력한 비밀번호 (최소 6자)
   - **Auto Confirm User**: 체크 ✅
4. "Create user" 클릭

### Step 2: 프로필 생성
1. "Table Editor" 클릭
2. "profiles" 테이블 선택
3. "+ Insert" > "Insert row" 클릭
4. 정보 입력:
   - **id**: 방금 생성한 사용자의 UUID (Authentication에서 복사)
   - **name**: 관리자 이름
   - **email**: admin@example.com
   - **role**: `admin` (드롭다운에서 선택)
5. "Save" 클릭

### Step 3: 로그인 테스트
1. 브라우저에서 http://localhost:3000/login 접속
2. 생성한 이메일과 비밀번호로 로그인
3. 성공하면 관리자 대시보드로 이동 ✅

---

## 5. Storage 설정

이미지 업로드를 위한 Storage Bucket 생성:

### Step 1: Bucket 생성
1. Supabase 대시보드에서 "Storage" 클릭
2. "+ New bucket" 클릭
3. 정보 입력:
   - **Name**: `public`
   - **Public bucket**: 체크 ✅
4. "Create bucket" 클릭

### Step 2: 폴더 생성 (선택사항)
Bucket 안에 폴더 구조 만들기:
- `images/` - 일반 이미지
- `posts/` - 게시글 이미지
- `albums/` - 앨범 사진
- `teachers/` - 교직원 사진

---

## 6. 카카오맵 API 키 발급

### Step 1: 카카오 개발자 계정 생성
1. https://developers.kakao.com 접속
2. 우측 상단 "로그인" 클릭
3. 카카오 계정으로 로그인

### Step 2: 애플리케이션 생성
1. "내 애플리케이션" 클릭
2. "애플리케이션 추가하기" 클릭
3. 정보 입력:
   - **앱 이름**: 자람동산어린이집
   - **사업자명**: (선택사항)
4. "저장" 클릭

### Step 3: JavaScript 키 복사
1. 생성된 앱 클릭
2. "앱 키" 탭에서 **JavaScript 키** 복사
3. `.env.local` 파일에 붙여넣기:
```bash
NEXT_PUBLIC_KAKAO_MAP_KEY=여기에_복사한_키_붙여넣기
```

### Step 4: 플랫폼 등록
1. "플랫폼" 탭 클릭
2. "Web 플랫폼 등록" 클릭
3. **사이트 도메인** 입력:
   - `http://localhost:3000` (개발용)
   - 나중에 배포 시 실제 도메인 추가
4. "저장" 클릭

---

## ✅ 설정 완료!

모든 설정이 완료되었습니다. 이제 다음 기능들을 사용할 수 있습니다:

### 공개 페이지
- ✅ 메인 페이지: http://localhost:3000
- ✅ 소개: http://localhost:3000/about/greeting
- ✅ 보육과정: http://localhost:3000/curriculum/standard
- ✅ 게시판: http://localhost:3000/board/notice
- ✅ 앨범: http://localhost:3000/board/album
- ✅ 문의하기: http://localhost:3000/community/inquiry

### 관리자 페이지
- ✅ 로그인: http://localhost:3000/login
- ✅ 대시보드: http://localhost:3000/admin
- ✅ 게시글 관리: http://localhost:3000/admin/posts
- ✅ 페이지 관리: http://localhost:3000/admin/pages
- ✅ 앨범 관리: http://localhost:3000/admin/albums
- ✅ 교직원 관리: http://localhost:3000/admin/teachers
- ✅ 문의 관리: http://localhost:3000/admin/inquiries
- ✅ 사이트 설정: http://localhost:3000/admin/settings

---

## 🚀 다음 할 일

1. **게시글 작성**: `/admin/posts` → "새 게시글" 버튼
2. **앨범 생성**: `/admin/albums` → "새 앨범" 버튼
3. **교직원 추가**: `/admin/teachers` → "교직원 추가" 버튼
4. **사이트 설정 수정**: `/admin/settings`

문제가 발생하면 이 가이드를 다시 확인하거나, Supabase 로그를 확인하세요!
