"use client";

import { PortfolioShowcase } from "@/app/_components/portfolio-showcase";
import { SiteNav } from "@/app/_components/site-nav";
import { usePortfolioData } from "@/app/_components/portfolio-data";

export function PortfolioGridClient() {
  const { sites, isLoading } = usePortfolioData();
  return <main className="public-page--works">
    <SiteNav />
    <header className="works-heading"><p className="works-heading__eyebrow">SELECTED WORKS / LIVE ARCHIVE</p><h1>让想法，真实运行。</h1></header>
    {isLoading ? <p className="works-loading" role="status">正在打开作品展厅…</p> : <PortfolioShowcase sites={sites} />}
  </main>;
}
