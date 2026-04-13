import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 콘텐츠 만들기 실습",
  description: "중장년층 대상 AI 콘텐츠 제작 실습 웹페이지",
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
