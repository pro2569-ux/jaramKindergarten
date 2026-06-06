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
