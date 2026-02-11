# Supabase 이메일 인증 비활성화 설정

## 문제
회원가입 후 "email not confirmed" 에러 발생

## 해결 방법

### Supabase Dashboard에서 설정 변경:

1. **Supabase Dashboard** 접속
   - https://supabase.com/dashboard

2. **Authentication** → **Settings** 메뉴로 이동

3. **Email Auth** 섹션 찾기

4. **"Enable email confirmations"** 옵션을 **OFF**로 변경

5. **Save** 클릭

## 결과
- 회원가입 즉시 로그인 가능
- 이메일 인증 불필요
