"use client";

import { useEffect, useState } from "react";
import { BentoGrid } from "@/app/_components/bento-grid";
import { demoSites } from "@/app/_data/demo-sites";
import { getSites } from "@/app/_lib/api-client";
import { mergeSitesWithStatuses, type SiteWithStatus } from "@/app/_lib/site-mappers";
import { fetchMonitorMap } from "@/app/_lib/uptimeflare";

export function PortfolioGridClient() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const hasApiBaseUrl = Boolean(apiBaseUrl);
  const [sites, setSites] = useState<SiteWithStatus[]>(
    hasApiBaseUrl ? [] : mergeSitesWithStatuses(demoSites, {})
  );
  const [isLoading, setIsLoading] = useState(hasApiBaseUrl);

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
      } catch (error) {
        console.error("无法获取监控数据", error);

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
      <BentoGrid sites={sites} />
    </>
  );
}
