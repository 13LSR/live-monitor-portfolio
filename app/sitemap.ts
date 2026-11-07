import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/shared/site-identity";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/works", "/about"].map((path) => ({ url: new URL(path, SITE_ORIGIN).href }));
}
