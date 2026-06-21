import { DEFAULT_MONITOR_API_URL } from "@/app/_lib/constants";
import type { MonitorMap, UptimeFlareResponse } from "@/shared/types";

const monitorApiUrl =
  process.env.NEXT_PUBLIC_UPTIMEFLARE_API_URL || DEFAULT_MONITOR_API_URL;

export async function fetchMonitorMap(): Promise<MonitorMap> {
  const response = await fetch(monitorApiUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monitor request failed: ${response.status}`);
  }

  const data = (await response.json()) as UptimeFlareResponse;
  const monitors = data.monitors ?? {};

  return Object.fromEntries(
    Object.entries(monitors).map(([key, value]) => [
      key,
      {
        up: Boolean(value.up),
        latency: typeof value.latency === "number" ? value.latency : null,
      },
    ])
  );
}
