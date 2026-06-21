import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小茄的网站集合",
  description: "收录小茄部署在云平台上的在线网站作品。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
