import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
