import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getActiveTheme, themeToCssVars } from "@/lib/theme";
import { getMenuTree, headerNavOf } from "@/lib/site-nav";

export const metadata: Metadata = {
  title: {
    default: "자람동산어린이집",
    template: "%s | 자람동산어린이집",
  },
  description: "아이들이 건강하고 행복하게 자라는 곳, 자람동산어린이집입니다.",
  keywords: ["어린이집", "유치원", "자람동산", "보육", "유아교육"],
  authors: [{ name: "자람동산어린이집" }],
  openGraph: {
    title: "자람동산어린이집",
    description: "아이들이 건강하고 행복하게 자라는 곳",
    type: "website",
    locale: "ko_KR",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 활성 site_theme 색을 CSS 변수로 전역 주입 → 모든 공개 페이지·Header·Footer가 상속.
  // (테마 미설정/조회 실패 시 themeStyle=undefined → globals.css :root 폴백 사용)
  // 메뉴 트리도 여기서(태그 캐시) 읽어 헤더에 넘긴다 → 첫 화면부터 실제 메뉴, /api/menus 왕복 없음.
  const [theme, tree] = await Promise.all([getActiveTheme(), getMenuTree()]);
  const themeStyle = themeToCssVars(theme);
  const initialNav = headerNavOf(tree);

  return (
    <html lang="ko">
      <head>
        {/* Pretendard: 글자 단위 동적 서브셋 — 화면에 쓰인 글자 묶음만 내려받는다 (전체 굵기 파일 3MB → 수백 KB) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased" style={themeStyle}>
        <div className="flex min-h-screen flex-col">
          <Header initialNav={initialNav.length > 0 ? initialNav : undefined} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
