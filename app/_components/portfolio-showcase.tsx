import { PortfolioProject } from "@/app/_components/portfolio-project";
import { PublicGoodNotice } from "@/app/_components/public-good-notice";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";
import { splitFeaturedSites } from "@/app/_lib/portfolio-summary";

interface PortfolioShowcaseProps {
  sites: SiteWithStatus[];
}

export function PortfolioShowcase({ sites }: PortfolioShowcaseProps) {
  const { featuredSite, ordinarySites } = splitFeaturedSites(sites);

  if (!featuredSite) {
    return <p className="portfolio-empty">暂时还没有公开展示的网站</p>;
  }

  return (
    <section className="portfolio-showcase" aria-label="网站作品">
      <PortfolioProject site={featuredSite} featured />
      <PublicGoodNotice />
      {ordinarySites.length > 0 ? (
        <div className="portfolio-ordinary-grid" aria-label="更多网站作品">
          {ordinarySites.map((site) => (
            <PortfolioProject key={site.id} site={site} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
