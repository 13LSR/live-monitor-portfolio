import type { SiteCategory } from "@/shared/types";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

export type PortfolioCategoryFilter = SiteCategory | "all";

export const portfolioCategoryFilters: PortfolioCategoryFilter[] = [
  "all",
  "web",
  "landing",
  "tool",
  "other",
];

export function createCollectionSummary(sites: SiteWithStatus[]) {
  return sites.reduce(
    (summary, site) => {
      summary.total += 1;

      if (site.status.isOnline === true) {
        summary.online += 1;
      }

      if (site.status.isOnline === null) {
        summary.unknown += 1;
      }

      return summary;
    },
    { total: 0, online: 0, unknown: 0 }
  );
}

export function filterSitesByCategory(
  sites: SiteWithStatus[],
  category: PortfolioCategoryFilter
) {
  if (category === "all") {
    return sites;
  }

  return sites.filter((site) => site.category === category);
}

export function splitFeaturedSites(sites: SiteWithStatus[]) {
  const featuredSite = sites.find((site) => site.isFeatured) ?? sites[0] ?? null;
  const ordinarySites = featuredSite
    ? sites.filter((site) => site.id !== featuredSite.id)
    : [];

  return { featuredSite, ordinarySites };
}
