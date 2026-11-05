import type { SiteRecord } from "@/shared/types";
import { portfolioContent } from "../../shared/portfolio-content.ts";

const now = "2026-06-20T00:00:00.000Z";

export const demoSites: SiteRecord[] = portfolioContent.map((site, index) => ({
  ...site,
  id: index + 1,
  createdAt: now,
  updatedAt: now,
}));
