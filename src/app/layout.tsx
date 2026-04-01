import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdInsight — 마케팅 성과 대시보드",
  description: "10개국 마케팅 성과를 한눈에 확인하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
