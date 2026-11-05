"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { demoSites } from "@/app/_data/demo-sites";
import { getSites } from "@/app/_lib/api-client";
import { mergeSitesWithStatuses, reconcileSitesWithStatuses, type SiteWithStatus } from "@/app/_lib/site-mappers";
import { fetchMonitorMap } from "@/app/_lib/uptimeflare";
import { startVisiblePolling } from "@/app/_lib/visible-poller";

const PortfolioData = createContext<{
  sites: SiteWithStatus[]; isLoading: boolean; selectedId: number | null;
  selectSite: (id: number) => void;
}>({ sites: [], isLoading: true, selectedId: null, selectSite: () => {} });

export function usePortfolioData() { return useContext(PortfolioData); }

export function PortfolioDataProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const hasApiBaseUrl = Boolean(apiBaseUrl);
  const [sites, setSites] = useState<SiteWithStatus[]>(
    hasApiBaseUrl ? [] : mergeSitesWithStatuses(demoSites, {})
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(hasApiBaseUrl);

  useEffect(() => {
    let ignore = false;

    async function hydratePortfolio(signal: AbortSignal) {
      let resolvedSites = demoSites;

      try {
        resolvedSites = hasApiBaseUrl ? (await getSites({ signal })).sites : demoSites;
      } catch (error) {
        if (signal.aborted) return;
        console.error("无法获取站点列表", error);

        if (!ignore) {
          setSites([]);
          setIsLoading(false);
        }

        return;
      }

      if (!ignore && !signal.aborted) {
        setSites((previous) => reconcileSitesWithStatuses(resolvedSites, previous));
        setIsLoading(false);
      }

      try {
        const monitorMap = await fetchMonitorMap(signal);

        if (!ignore && !signal.aborted) {
          setSites(
            mergeSitesWithStatuses(resolvedSites, monitorMap, {
              monitorDataLoaded: true,
            })
          );
          setIsLoading(false);
        }
      } catch {
        if (signal.aborted) return;
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

    const stopPolling = startVisiblePolling(hydratePortfolio, {
      visibility: document,
    });
    return () => {
      ignore = true;
      stopPolling();
    };
  }, [hasApiBaseUrl]);

  return <PortfolioData value={{ sites, isLoading, selectedId, selectSite: setSelectedId }}>{children}</PortfolioData>;
}
