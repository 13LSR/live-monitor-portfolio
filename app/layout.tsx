import type { Metadata } from "next";
import "animal-island-ui/style";
import "./globals.css";
import "./_styles/immersive.css";
import "./_styles/gallery.css";
import "./_styles/architecture.css";
import { PortfolioShell } from "@/app/_components/portfolio-shell";
import { SITE_NAME, SITE_ORIGIN, SITE_DESCRIPTION } from "@/shared/site-identity";
import { pageMetadata } from "@/app/_lib/page-metadata";

export const metadata: Metadata = {
  ...pageMetadata(SITE_NAME, SITE_DESCRIPTION, "/"),
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><PortfolioShell>{children}</PortfolioShell></body>
    </html>
  );
}
