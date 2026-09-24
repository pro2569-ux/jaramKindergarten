import type { NextConfig } from "next";

// Supabase Storage 호스트를 환경변수에서 파싱 (프로젝트가 바뀌어도 자동 대응).
// 값이 없거나 잘못된 경우엔 빌드가 깨지지 않게 무시한다.
function getSupabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  // 회원가입 기능 제거(비로그인 방문자 + 관리자 계정만 사용). 남아 있는 옛 링크는 로그인으로 보낸다.
  async redirects() {
    return [
      { source: '/register', destination: '/login', permanent: true },
      // 입소신청서: 공지사항 글(이관, 비공개 전환) → 입학안내 아래 독립 페이지 (PR I)
      { source: '/board/notice/86fb8f3b-2ce5-4f09-b447-57fda6c0924d', destination: '/admission/application-form', permanent: true },
      // 교원/반편성: 옛 정적 라우트 → 메뉴와 같은 CMS 페이지 (PR M)
      { source: '/about/teachers', destination: '/about/class', permanent: true },
    ]
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
          // private 버킷(legacy-media)의 서명 URL
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/sign/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
