import { LiveProjectCard } from "@/app/_components/live-project-card";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface BentoGridProps {
  sites: SiteWithStatus[];
}

export function BentoGrid({ sites }: BentoGridProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {sites.map((site) => (
          <LiveProjectCard key={site.id} site={site} />
        ))}
      </div>
      {sites.length === 0 ? (
        <article className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/50 p-10 text-center text-slate-400 shadow-xl shadow-slate-950/20">
          暂时还没有公开展示的网站。
        </article>
      ) : null}
    </section>
  );
}
