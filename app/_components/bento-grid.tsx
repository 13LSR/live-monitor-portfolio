import { LiveProjectCard } from "@/app/_components/live-project-card";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface BentoGridProps {
  sites: SiteWithStatus[];
}

export function BentoGrid({ sites }: BentoGridProps) {
  const [featuredSite, ...otherSites] = sites;

  return (
    <section className="space-y-5">
      {featuredSite ? (
        <LiveProjectCard site={featuredSite} featured />
      ) : null}
      {otherSites.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {otherSites.map((site) => (
            <LiveProjectCard key={site.id} site={site} />
          ))}
        </div>
      ) : null}
      {sites.length === 0 ? (
        <article className="border border-dashed border-[var(--line)] bg-[var(--paper-raised)] p-10 text-center text-[var(--muted)] shadow-[8px_8px_0_rgba(31,37,35,0.18)]">
          暂时还没有公开展示的网站
        </article>
      ) : null}
    </section>
  );
}
