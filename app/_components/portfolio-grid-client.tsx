"use client";

import { useEffect, useState } from "react";
import { BentoGrid } from "@/app/_components/bento-grid";
import { demoSites } from "@/app/_data/demo-sites";
import { getSites } from "@/app/_lib/api-client";
import {
  createCollectionSummary,
  filterSitesByCategory,
  portfolioCategoryFilters,
  type PortfolioCategoryFilter,
} from "@/app/_lib/portfolio-summary";
import {
  mergeSitesWithStatuses,
  type SiteWithStatus,
} from "@/app/_lib/site-mappers";
import { fetchMonitorMap } from "@/app/_lib/uptimeflare";

const filterLabels: Record<PortfolioCategoryFilter, string> = {
  all: "全部",
  web: "网站",
  landing: "落地页",
  tool: "工具",
  other: "其他",
};

export function PortfolioGridClient() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const hasApiBaseUrl = Boolean(apiBaseUrl);
  const [sites, setSites] = useState<SiteWithStatus[]>(
    hasApiBaseUrl ? [] : mergeSitesWithStatuses(demoSites, {})
  );
  const [isLoading, setIsLoading] = useState(hasApiBaseUrl);
  const [activeCategory, setActiveCategory] =
    useState<PortfolioCategoryFilter>("all");
  const summary = createCollectionSummary(sites);
  const filteredSites = filterSitesByCategory(sites, activeCategory);

  useEffect(() => {
    let ignore = false;

    async function hydratePortfolio() {
      let resolvedSites = demoSites;

      try {
        resolvedSites = hasApiBaseUrl ? (await getSites()).sites : demoSites;
      } catch (error) {
        console.error("无法获取站点列表", error);

        if (!ignore) {
          setSites([]);
          setIsLoading(false);
        }

        return;
      }

      if (!ignore) {
        setSites(mergeSitesWithStatuses(resolvedSites, {}));
        setIsLoading(false);
      }

      try {
        const monitorMap = await fetchMonitorMap();

        if (!ignore) {
          setSites(
            mergeSitesWithStatuses(resolvedSites, monitorMap, {
              monitorDataLoaded: true,
            })
          );
          setIsLoading(false);
        }
      } catch {
        console.warn("监控数据暂时不可用，已使用未知状态。");

        if (!ignore) {
          setSites(
            mergeSitesWithStatuses(resolvedSites, {}, {
              monitorDataLoaded: true,
            })
          );
          setIsLoading(false);
        }
      }
    }

    void hydratePortfolio();
    const interval = setInterval(() => {
      void hydratePortfolio();
    }, 60_000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [hasApiBaseUrl]);

  return (
    <>
      {isLoading ? (
        <p className="mb-8 font-mono text-sm text-[var(--muted)]">
          正在加载网站...
        </p>
      ) : null}
      <section className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-[var(--line)] bg-[#fff7df] px-4 py-4 shadow-[5px_5px_0_rgba(31,37,35,0.12)] md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          岛上现在有{" "}
          <span className="font-semibold text-[var(--ink)]">
            {summary.total}
          </span>{" "}
          间网站小屋，其中{" "}
          <span className="font-semibold text-[var(--green)]">
            {summary.online}
          </span>{" "}
          座小屋亮着灯
          {summary.unknown > 0 ? `，${summary.unknown} 座还在等巡岛信号` : "。"}
        </p>
        <div className="flex flex-wrap gap-2">
          {portfolioCategoryFilters.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`border border-[var(--line)] px-3 py-2 text-xs font-semibold transition ${
                activeCategory === category
                  ? "bg-[var(--ink)] text-[#fffaf0]"
                  : "bg-[#fffaf0] text-[var(--ink)] hover:bg-[#e7eadf]"
              }`}
            >
              {filterLabels[category]}
            </button>
          ))}
        </div>
      </section>
      <BentoGrid sites={filteredSites} />
    </>
  );
}
