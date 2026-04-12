-- ============================================================
-- profiles RLS 무한 재귀 오류 수정
-- ============================================================
-- 문제: "Admins can view all profiles" 정책이 profiles를 다시 SELECT하여
--       PostgreSQL이 정책을 재귀적으로 평가 → infinite recursion 에러 발생
--
-- 해결: SECURITY DEFINER 함수로 profiles 조회를 RLS 우회
-- ============================================================

-- 1. 기존의 재귀 유발 정책 제거
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- 2. RLS를 우회하는 SECURITY DEFINER 함수 생성
--    이 함수는 함수 정의자(보통 postgres)의 권한으로 실행되어 RLS를 무시함
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. 정책 재생성 (함수를 통해 재귀 없이 admin 체크)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (public.is_admin());

-- 4. 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'profiles';
