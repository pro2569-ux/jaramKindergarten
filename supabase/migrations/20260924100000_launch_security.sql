-- ============================================================
-- 오픈 전 보안 보정 (PR L) — 이 파일 하나만 Supabase 대시보드 SQL Editor 에서 실행하면 완결.
-- 전부 멱등(CREATE OR REPLACE / DROP … IF EXISTS / IF NOT EXISTS)이라 여러 번 실행해도 안전.
-- ============================================================
-- (1) 가입 트리거: 클라이언트 메타데이터의 role 을 신뢰하지 않고 'parent' 고정 (승격은 관리자만)
-- (2) profiles 전체 공개 정책("Public can read profiles" USING(true)) 제거 → 본인 + admin 만 조회
-- (3) inquiries: 익명이 비공개 아닌 문의(학부모 이름·이메일·전화)를 읽던 정책 제거 → 관리자/교사만 조회.
--     문의 기본값 비공개, INSERT 는 신규 접수(status pending, 답변 없음)만 허용, 동의 시각 컬럼 추가
-- (4) role UPDATE 상승 차단 트리거 재적용(20260721000000 과 동일, 멱등)
-- (5) publicImage 버킷 파일 크기 제한(10MB) — 관리자 업로드 상한 (앱은 5MB 로 먼저 거른다)
-- ============================================================

-- ── 공통: RLS 우회 admin 판정 (재귀 방지, SECURITY DEFINER) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ── (1) 가입 트리거 함수: role 고정 ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'parent',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── (4) role UPDATE 상승 차단 ──
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'role은 관리자만 변경할 수 있습니다.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ── (2) profiles: 전체 공개 정책 제거, 본인/admin 조회만 ──
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- ── (3) inquiries ──
DROP POLICY IF EXISTS "Users can read own inquiries" ON public.inquiries;

DROP POLICY IF EXISTS "Staff can read all inquiries" ON public.inquiries;
CREATE POLICY "Staff can read all inquiries"
  ON public.inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- 누구나 접수는 가능하되, 신규 접수 형태(답변 없음·pending)만
DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Anyone can create inquiries"
  ON public.inquiries FOR INSERT
  WITH CHECK (status = 'pending' AND reply IS NULL AND replied_at IS NULL);

ALTER TABLE public.inquiries ALTER COLUMN is_private SET DEFAULT true;
-- 개인정보 수집·이용 동의 시각 (앱이 접수 시 기록)
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- ── (5) publicImage 버킷 상한 ──
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'publicImage' AND file_size_limit IS NULL;

-- ── 확인용 ──
-- SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('profiles','inquiries') ORDER BY tablename, policyname;
-- SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_prevent_profile_role_escalation','on_auth_user_created');
-- SELECT id, public, file_size_limit FROM storage.buckets;
