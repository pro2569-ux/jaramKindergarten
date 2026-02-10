# 이미지 가이드

## 📁 폴더 구조

```
public/images/
├── hero/          # 메인 배너/히어로 이미지
├── about/         # 소개 페이지 이미지
├── curriculum/    # 교육과정 이미지
└── activities/    # 활동 사진
```

## 🖼️ 이미지 추가 방법

### 1. 이미지 파일 준비

어린이집에 어울리는 이미지를 준비하세요:
- **히어로 배너**: 1920x600px (가로로 긴 이미지)
- **섹션 이미지**: 800x600px
- **썸네일**: 400x300px

### 2. 파일 배치

이미지를 해당 폴더에 복사하세요:
```
public/images/hero/main-banner.jpg
public/images/about/greeting.jpg
public/images/curriculum/classroom.jpg
```

### 3. 코드에서 사용

```tsx
import Image from 'next/image'

<Image
  src="/images/hero/main-banner.jpg"
  alt="자람동산어린이집"
  width={1920}
  height={600}
  priority
/>
```

## 🎨 무료 이미지 사이트 추천

### 어린이집/유치원 관련 무료 이미지:

1. **Unsplash** (https://unsplash.com)
   - 검색어: "kindergarten", "children playing", "classroom", "kids learning"

2. **Pexels** (https://pexels.com)
   - 검색어: "preschool", "daycare", "kids education"

3. **Pixabay** (https://pixabay.com)
   - 검색어: "children", "school", "playground"

### 다운로드 후:
1. 이미지를 다운로드
2. 적절한 크기로 리사이즈 (무료 도구: https://squoosh.app)
3. `public/images/` 폴더에 저장
4. 코드에서 경로 지정

## 📝 예시 이미지 구성

### 메인페이지 (최소 권장):
- `hero/main-banner.jpg` - 메인 배너 (아이들이 놀고 있는 모습)
- `about/kindergarten-front.jpg` - 어린이집 외관
- `about/director.jpg` - 원장님 사진 (선택)

### 소개 페이지:
- `about/classroom-1.jpg` - 교실 사진
- `about/playground.jpg` - 놀이터
- `about/activities.jpg` - 활동 모습

### 교육과정:
- `curriculum/standard-care.jpg`
- `curriculum/nuri-program.jpg`
- `curriculum/forest-program.jpg`

## 💡 팁

1. **파일 크기**: 각 이미지는 200KB 이하로 최적화하세요
2. **파일명**: 영문과 하이픈만 사용 (예: `main-banner.jpg`)
3. **포맷**: JPG (사진), PNG (로고/아이콘)
4. **Next.js Image**: 자동으로 최적화되고 lazy loading 됩니다
