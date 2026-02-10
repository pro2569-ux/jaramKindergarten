# 배포 가이드 (Vercel)

실제 웹에 배포하는 완전한 가이드입니다.

## 📋 사전 준비사항

✅ Supabase 프로젝트 설정 완료 (SETUP_GUIDE.md 참조)
✅ 로컬에서 프로젝트 정상 작동 확인
✅ GitHub 계정
✅ Vercel 계정 (없으면 GitHub로 가입 가능)

---

## 🚀 배포 단계

### Step 1: GitHub 저장소 생성 및 푸시

#### 1-1. GitHub 저장소 생성
1. https://github.com 접속 및 로그인
2. 우측 상단 "+" 클릭 → "New repository"
3. 저장소 정보 입력:
   - **Repository name**: `jaram-kindergarten` (원하는 이름)
   - **Description**: 자람동산어린이집 웹사이트
   - **Public** 또는 **Private** 선택
   - ⚠️ **Add a README, .gitignore, license 모두 체크 해제** (이미 있음)
4. "Create repository" 클릭

#### 1-2. GitHub에 푸시
저장소 생성 후 나오는 명령어 중 다음을 실행:

```bash
# GitHub 저장소 연결 (URL은 본인 것으로 변경)
git remote add origin https://github.com/username/jaram-kindergarten.git

# 푸시
git push -u origin master
```

✅ GitHub 저장소에 코드가 업로드되었는지 확인

---

### Step 2: Vercel 배포

#### 2-1. Vercel 계정 생성 및 로그인
1. https://vercel.com 접속
2. "Sign Up" 또는 "Login"
3. **"Continue with GitHub"** 선택 (추천)
4. GitHub 권한 승인

#### 2-2. 프로젝트 Import
1. 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소에서 `jaram-kindergarten` 찾기
3. **"Import"** 클릭

#### 2-3. 프로젝트 설정
**Framework Preset**: Next.js (자동 감지됨)

**환경 변수 설정** - 매우 중요! ⚠️

"Environment Variables" 섹션에서 다음 3개 추가:

| Name | Value | 어디서 가져오나요? |
|------|-------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 대시보드 → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase 대시보드 → Settings → API |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | `카카오맵 키` | Kakao Developers |

**Environment**:
- ✅ Production
- ✅ Preview
- ✅ Development

모두 체크!

#### 2-4. 배포 시작
**"Deploy"** 버튼 클릭

⏳ 빌드 및 배포 진행 (2-3분 소요)

---

### Step 3: 배포 완료 확인

#### 3-1. 배포 성공 확인
✅ "Congratulations!" 메시지 표시
✅ 프로젝트 URL 확인: `https://jaram-kindergarten.vercel.app`

#### 3-2. 웹사이트 테스트
1. **메인 페이지 접속**
   ```
   https://your-project.vercel.app
   ```

2. **관리자 로그인 테스트**
   ```
   https://your-project.vercel.app/login
   ```

3. **데이터 확인**
   - 공지사항 목록이 제대로 표시되는지
   - 이미지가 정상적으로 로드되는지

---

### Step 4: 도메인 연결 (선택사항)

자신의 도메인을 연결하려면:

#### 4-1. Vercel에서 도메인 추가
1. 프로젝트 대시보드 → **"Settings"** → **"Domains"**
2. 원하는 도메인 입력 (예: `jaramk.com`)
3. "Add" 클릭

#### 4-2. DNS 설정
Vercel이 제공하는 DNS 레코드를 도메인 제공업체에 추가:

**A 레코드:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME 레코드:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 4-3. 확인
DNS 전파까지 최대 48시간 소요 (보통 10분 내)

---

## 🔧 배포 후 설정

### Supabase Redirect URL 추가

Vercel 배포 후 반드시 설정!

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. **Site URL** 업데이트:
   ```
   https://your-project.vercel.app
   ```

3. **Redirect URLs** 추가:
   ```
   https://your-project.vercel.app/admin
   https://your-project.vercel.app/*
   ```

4. "Save" 클릭

### 카카오맵 플랫폼 추가

1. Kakao Developers → 애플리케이션 선택
2. **플랫폼** → **Web 플랫폼 추가**
3. 사이트 도메인 추가:
   ```
   https://your-project.vercel.app
   ```

4. "저장" 클릭

---

## 🔄 자동 배포 (CI/CD)

GitHub에 푸시하면 자동으로 배포됩니다!

```bash
# 코드 수정 후
git add .
git commit -m "update: 기능 수정"
git push

# → Vercel이 자동으로 감지하고 재배포
```

**배포 확인**:
- Vercel 대시보드에서 실시간 빌드 로그 확인
- 성공하면 자동으로 사이트 업데이트

---

## 🐛 문제 해결

### 빌드 실패 시

**1. 환경 변수 확인**
```
Vercel 대시보드 → Settings → Environment Variables
```
- 모든 변수가 입력되었는지
- 오타가 없는지 확인

**2. 빌드 로그 확인**
```
Deployments → 실패한 배포 클릭 → Build Logs 확인
```

**3. 로컬에서 프로덕션 빌드 테스트**
```bash
npm run build
npm run start
```

### 데이터가 안 보일 때

**1. Supabase 연결 확인**
- 브라우저 개발자 도구 → Console 탭
- Supabase 관련 에러 확인

**2. RLS 정책 확인**
- Supabase → Authentication → Policies
- 공개 데이터는 읽기 정책이 있는지 확인

**3. 환경 변수 재확인**
```
Vercel → Settings → Environment Variables
```
- URL과 Key가 정확한지
- 수정했다면 재배포 필요

### 이미지가 안 보일 때

**1. Supabase Storage 공개 확인**
- Storage → Bucket → Public 체크

**2. CORS 설정 (필요시)**
- Supabase Storage Settings → CORS

---

## 📊 배포 후 관리

### 로그 확인
```
Vercel 대시보드 → Project → Logs
```

### 분석 (Analytics)
```
Vercel 대시보드 → Analytics
```
- 방문자 수
- 페이지뷰
- 성능 지표

### 재배포
```
Vercel 대시보드 → Deployments → ⋯ → Redeploy
```

---

## 🎯 배포 체크리스트

배포 전:
- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 관리자 계정 생성 완료
- [ ] 로컬에서 정상 작동 확인
- [ ] GitHub 저장소 생성 완료

Vercel 배포:
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 3개 설정
- [ ] 배포 성공 확인
- [ ] 웹사이트 접속 확인

배포 후:
- [ ] Supabase Redirect URL 추가
- [ ] 카카오맵 플랫폼 추가
- [ ] 관리자 로그인 테스트
- [ ] 데이터 표시 확인
- [ ] 이미지 로드 확인

---

## 🚀 완료!

축하합니다! 웹사이트가 실제로 배포되었습니다.

**배포된 URL**: `https://your-project.vercel.app`

이제 전 세계 어디서나 접속 가능합니다! 🌍

---

## 💡 추가 팁

### 성능 최적화
- Vercel은 자동으로 이미지 최적화
- Edge Network로 전 세계 빠른 로딩
- 자동 HTTPS 적용

### 비용
- Vercel Free Plan:
  - ✅ 무제한 배포
  - ✅ 자동 HTTPS
  - ✅ 100GB 대역폭/월
  - ✅ 상업적 사용 가능

- Supabase Free Plan:
  - ✅ 500MB 데이터베이스
  - ✅ 1GB 파일 저장소
  - ✅ 50,000명 활성 사용자

### 백업
정기적으로 Git 푸시로 자동 백업:
```bash
git add .
git commit -m "backup: $(date +%Y-%m-%d)"
git push
```

문제가 있으면 언제든지 문의하세요! 🙋‍♂️
