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
  // jsdom(isomorphic-dompurify 내부)은 동적 require가 많아 서버 번들 트레이싱에서 누락되어
  // Vercel 서버리스 런타임에서 모듈을 못 찾아 SSR 중 500이 난다.
  // 번들에서 제외하고 런타임에 node_modules에서 직접 로드하도록 외부 패키지로 지정.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
