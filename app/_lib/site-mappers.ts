import type { MonitorMap, SiteRecord } from "@/shared/types";

export interface SiteWithStatus extends SiteRecord {
  status: {
    isOnline: boolean | null;
    latency: number | null;
    hasMonitorKey: boolean;
    monitorDataLoaded: boolean;
    monitorMatched: boolean;
  };
}

interface MergeSitesWithStatusesOptions {
  monitorDataLoaded?: boolean;
}

export function mergeSitesWithStatuses(
  sites: SiteRecord[],
  monitorMap: MonitorMap,
  options: MergeSitesWithStatusesOptions = {}
): SiteWithStatus[] {
  return sites.map((site) => {
    const monitorKey = site.monitorKey?.trim() ?? "";
    const monitor = monitorKey ? monitorMap[monitorKey] : undefined;

    return {
      ...site,
      status: {
        isOnline: typeof monitor?.up === "boolean" ? monitor.up : null,
        latency: monitor?.latency ?? null,
        hasMonitorKey: Boolean(monitorKey),
        monitorDataLoaded: options.monitorDataLoaded ?? false,
        monitorMatched: Boolean(monitor),
      },
    };
  });
}
