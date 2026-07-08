import { DEFAULT_MONITOR_API_URL } from "@/app/_lib/constants";
import type { MonitorMap, UptimeFlareResponse } from "@/shared/types";

const monitorApiUrl =
  process.env.NEXT_PUBLIC_UPTIMEFLARE_API_URL || DEFAULT_MONITOR_API_URL;
const MONITOR_FETCH_TIMEOUT_MS = 4_000;

export async function fetchMonitorMap(): Promise<MonitorMap> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    MONITOR_FETCH_TIMEOUT_MS
  );

  let response: Response;

  try {
    response = await fetch(monitorApiUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

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
