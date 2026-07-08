export type SiteCategory = "web" | "landing" | "tool" | "other";

export type CoverMode = "iframe" | "text" | "gallery";

export interface SiteRecord {
  id: number;
  name: string;
  slug: string;
  url: string;
  monitorKey: string | null;
  category: SiteCategory;
  description: string;
  summary: string;
  tags: string[];
  techStack: string[];
  isFeatured: boolean;
  repoUrl: string | null;
  fallbackUrl: string | null;
  coverMode: CoverMode;
  sortOrder: number;
  isVisible: boolean;
  allowInteraction: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorState {
  up: boolean;
  latency: number | null;
}

export type MonitorMap = Record<string, MonitorState>;

export interface UptimeFlareMonitor {
  up: boolean;
  latency?: number | null;
}

export interface UptimeFlareResponse {
  monitors?: Record<string, UptimeFlareMonitor>;
}
