-- 이메일 자동 확인 함수
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = user_id
  AND email_confirmed_at IS NULL;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION confirm_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email TO anon;
