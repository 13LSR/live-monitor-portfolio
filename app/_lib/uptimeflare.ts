import { DEFAULT_MONITOR_API_URL } from "@/app/_lib/constants";
import type { MonitorMap, UptimeFlareResponse } from "@/shared/types";

export const MONITOR_FETCH_TIMEOUT_MS = 15_000;

export function resolveMonitorApiUrl(
  configuredUrl = process.env.NEXT_PUBLIC_UPTIMEFLARE_API_URL
) {
  const rawUrl = configuredUrl?.trim() || DEFAULT_MONITOR_API_URL;

  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, "");

    if (!pathname || pathname === "") {
      url.pathname = "/api/data";
      return url.toString();
    }

    if (!pathname.endsWith("/api/data")) {
      url.pathname = `${pathname}/api/data`;
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const monitorApiUrl = resolveMonitorApiUrl();

export async function fetchMonitorMap(signal?: AbortSignal): Promise<MonitorMap> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MONITOR_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(monitorApiUrl, {
      cache: "no-store",
      signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
    });
    if (!response.ok) throw new Error(`Monitor request failed: ${response.status}`);
    const data = (await response.json()) as UptimeFlareResponse;
    const monitors = data.monitors ?? {};
    return Object.fromEntries(
      Object.entries(monitors).map(([key, value]) => [key, {
        up: Boolean(value.up),
        latency: typeof value.latency === "number" ? value.latency : null,
      }])
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
