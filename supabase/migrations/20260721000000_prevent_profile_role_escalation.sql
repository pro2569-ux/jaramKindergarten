-- ============================================================
-- profiles 권한 상승(self privilege escalation) 차단
-- ============================================================
-- 문제: "Users can update own profile" 정책이 USING (auth.uid() = id)만 있고
--       WITH CHECK / role 컬럼 보호가 없어, 로그인한 일반 사용자가
--         update profiles set role = 'admin' where id = auth.uid()
--       를 실행하면 스스로 admin으로 권한 상승 가능 → 관리자 전체 장악.
--
-- 해결: BEFORE UPDATE 트리거로 role 변경을 admin만 허용.
--       (정책의 WITH CHECK 서브쿼리로 막으면 profiles를 다시 SELECT하게 되어
--        20240101000002에서 고친 RLS 무한 재귀가 재발하므로, SECURITY DEFINER
--        트리거 방식을 사용한다. 트리거는 정책 구성과 무관하게 항상 강제된다.)
-- ============================================================

-- is_admin()은 20240101000002_fix_profiles_recursion.sql에서 생성되지만,
-- 이 마이그레이션을 단독 실행하는 경우에도 안전하도록 방어적으로 재정의한다.
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

-- role 변경 시도를 검사하는 트리거 함수.
-- SECURITY DEFINER + is_admin()으로 RLS 우회 조회하므로 재귀가 발생하지 않는다.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- role이 실제로 바뀌는 경우에만 검사. 관리자는 자유롭게 변경 가능.
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'role은 관리자만 변경할 수 있습니다.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();
