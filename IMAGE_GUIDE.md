# 🖼️ 이미지 추가 완전 가이드

사이트를 더 풍성하게 만들기 위한 이미지 추가 방법입니다.

---

## 📥 1단계: 무료 이미지 다운로드

### 추천 사이트

**Unsplash** (고품질, 무료, 상업적 이용 가능)
- 사이트: https://unsplash.com
- 회원가입 불필요
- 라이선스: 자유롭게 사용 가능

**Pexels** (다양한 선택지)
- 사이트: https://pexels.com
- 회원가입 불필요
- 라이선스: 자유롭게 사용 가능

---

## 🔍 2단계: 검색어 추천

### 메인 배너용 (1920x600px 권장)
```
검색어:
- "children playing outdoor"
- "kids kindergarten"
- "happy children classroom"
- "children learning together"
```

**추천 이미지 예시:**
1. Unsplash: https://unsplash.com/s/photos/children-playing
2. Pexels: https://www.pexels.com/search/kindergarten/

### 어린이집 건물/교실 (800x600px)
```
검색어:
- "kindergarten classroom"
- "preschool interior"
- "children classroom"
- "daycare room"
```

### 활동 사진 (400x300px)
```
검색어:
- "kids art"
- "children outdoor activity"
- "kids playing"
- "children reading"
```

---

## 💾 3단계: 이미지 다운로드 및 최적화

### 방법 1: 직접 다운로드 (간단)

1. **이미지 선택**
   - 원하는 이미지 클릭
   - "Download" 버튼 클릭
   - 크기 선택 (Medium 또는 Large 추천)

2. **파일 저장**
   ```
   다운로드 폴더에 저장됨
   예: Downloads/pexels-photo-123456.jpg
   ```

3. **파일 이름 변경**
   ```
   pexels-photo-123456.jpg  →  main-banner.jpg
   ```

### 방법 2: 이미지 최적화 (권장)

**Squoosh 사용** (무료, 온라인)
1. https://squoosh.app 접속
2. 이미지 드래그 앤 드롭
3. 오른쪽에서 설정:
   - Format: JPEG (사진) 또는 PNG (로고)
   - Quality: 80-85
4. 우측 하단 "Download" 클릭

**목표 파일 크기:**
- 메인 배너: 200-300KB
- 일반 이미지: 100-200KB
- 썸네일: 50-100KB

---

## 📁 4단계: 파일 배치

### 파일 탐색기에서:

1. **프로젝트 폴더 열기**
   ```
   C:\Project\jaram
   ```

2. **이미지 폴더로 이동**
   ```
   C:\Project\jaram\public\images
   ```

3. **파일 복사**
   ```
   메인 배너:
   다운로드한 파일 → public/images/hero/main-banner.jpg

   어린이집 사진:
   다운로드한 파일 → public/images/about/kindergarten.jpg

   교실 사진:
   다운로드한 파일 → public/images/about/classroom.jpg
   ```

### 권장 파일 구조:
```
public/images/
├── hero/
│   └── main-banner.jpg          (메인 배너, 1920x600)
├── about/
│   ├── kindergarten.jpg         (어린이집 외관, 800x600)
│   ├── classroom.jpg            (교실, 800x600)
│   └── playground.jpg           (놀이터, 800x600)
├── curriculum/
│   ├── standard-care.jpg        (보육과정, 600x400)
│   ├── nuri-program.jpg         (누리과정, 600x400)
│   └── forest-program.jpg       (숲유치원, 600x400)
└── activities/
    ├── art.jpg                  (미술활동, 400x300)
    ├── music.jpg                (음악활동, 400x300)
    └── outdoor.jpg              (야외활동, 400x300)
```

---

## 🔧 5단계: 코드에서 활성화

### 메인페이지 배너 이미지 활성화

**파일**: `app/page.tsx`

**찾기** (약 52번째 줄):
```tsx
{/* TODO: public/images/hero/main-banner.jpg 파일을 추가하면 아래 주석을 해제하세요 */}
{/* <Image
  src="/images/hero/main-banner.jpg"
  alt="자람동산어린이집"
  fill
  className="object-cover"
  priority
/> */}
```

**주석 제거** (이미지 추가 후):
```tsx
<Image
  src="/images/hero/main-banner.jpg"
  alt="자람동산어린이집"
  fill
  className="object-cover"
  priority
/>
```

**그 아래 3줄 삭제** (placeholder 제거):
```tsx
{/* 이미지가 없을 때는 그라데이션 패턴 */}
<div className="absolute inset-0 bg-gradient-to-r from-green-500 via-green-400 to-blue-400 opacity-90" />
<div className="absolute inset-0" style={{...}} />
```

### 어린이집 소개 이미지 활성화

**파일**: `app/page.tsx`

**찾기** (약 135번째 줄):
```tsx
{/* TODO: public/images/about/kindergarten.jpg 파일을 추가하면 아래 주석을 해제하세요 */}
{/* <Image
  src="/images/about/kindergarten.jpg"
  alt="자람동산어린이집"
  fill
  className="object-cover"
/> */}
```

**주석 제거**:
```tsx
<Image
  src="/images/about/kindergarten.jpg"
  alt="자람동산어린이집"
  fill
  className="object-cover"
/>
```

**Placeholder 제거**:
```tsx
{/* Placeholder */}
<div className="w-full h-full bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 flex items-center justify-center">
  ...
</div>
```

---

## ✅ 체크리스트

### 최소 필수 이미지 (3개)
- [ ] `public/images/hero/main-banner.jpg` - 메인 배너
- [ ] `public/images/about/kindergarten.jpg` - 어린이집 사진
- [ ] `public/logo.svg` - 로고 (이미 생성됨 ✅)

### 추가 권장 이미지 (선택)
- [ ] `public/images/about/classroom.jpg` - 교실
- [ ] `public/images/about/playground.jpg` - 놀이터
- [ ] `public/images/curriculum/standard-care.jpg`
- [ ] `public/images/curriculum/nuri-program.jpg`
- [ ] `public/images/curriculum/forest-program.jpg`

---

## 🚀 배포 후 확인

1. **로컬에서 확인**
   ```bash
   npm run dev
   ```
   - http://localhost:3000 접속
   - 이미지가 제대로 표시되는지 확인

2. **Git 커밋 및 푸시**
   ```bash
   git add public/images
   git commit -m "feat: 메인페이지 이미지 추가"
   git push
   ```

3. **Vercel 자동 배포**
   - GitHub에 푸시하면 자동으로 배포됨
   - 2-3분 후 실제 사이트에서 확인

---

## 💡 팁

### 저작권 걱정 없는 이미지
- **Unsplash, Pexels**: 완전 무료, 상업적 이용 가능
- **출처 표기**: 선택사항 (권장하지만 필수 아님)

### 이미지 선택 기준
1. **밝고 따뜻한 느낌**: 어린이집에 어울리는 분위기
2. **고해상도**: 흐릿하지 않은 선명한 이미지
3. **구도**: 너무 복잡하지 않고 깔끔한 구도

### 파일 크기 최적화가 중요한 이유
- 로딩 속도 향상
- 모바일 데이터 절약
- SEO 개선

---

## 🆘 문제 해결

### 이미지가 안 보여요
1. 파일 경로 확인
   ```
   public/images/hero/main-banner.jpg
   (public 폴더 안에 있어야 함)
   ```

2. 파일명 확인 (대소문자 구분)
   ```
   main-banner.jpg ✅
   Main-Banner.JPG ❌
   ```

3. 코드에서 주석 제거했는지 확인

4. 개발 서버 재시작
   ```bash
   Ctrl+C (서버 중지)
   npm run dev (다시 시작)
   ```

### 이미지가 너무 커요
- Squoosh.app에서 Quality를 70-80으로 낮추세요
- 또는 리사이즈: 1920px 이하로

---

## 📞 추가 도움

문제가 있으면 언제든지 물어보세요!
