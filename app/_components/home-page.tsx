import { PortfolioGridClient } from "@/app/_components/portfolio-grid-client";
import { PortfolioFooter } from "@/app/_components/portfolio-footer";
import { PortfolioHero } from "@/app/_components/portfolio-hero";

export function HomePage() {
  return (
    <main className="portfolio-cursor--force min-h-screen text-[var(--ink)]">
      <PortfolioHero />
      <div id="featured-work" className="portfolio-content-surface px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PortfolioGridClient />
          <PortfolioFooter />
        </div>
      </div>
    </main>
  );
}
