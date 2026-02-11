-- 기존 사용자들의 프로필 데이터 수정 및 생성

-- 1. 프로필이 없는 사용자들의 프로필 자동 생성
INSERT INTO profiles (id, name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
  u.email,
  CASE
    WHEN u.email LIKE '%admin%' THEN 'admin'
    WHEN u.email LIKE '%teacher%' THEN 'teacher'
    ELSE 'parent'
  END as role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. 이름이 빈 프로필 업데이트
UPDATE profiles p
SET name = COALESCE(
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
  split_part(p.email, '@', 1)
)
WHERE (name IS NULL OR name = '');

-- 3. 이메일이 없는 프로필 업데이트
UPDATE profiles p
SET email = (SELECT email FROM auth.users WHERE id = p.id)
WHERE email IS NULL;

-- 4. 결과 확인
SELECT
  p.id,
  p.name,
  p.email,
  p.role,
  u.email as auth_email
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;
