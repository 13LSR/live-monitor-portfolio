import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/shared/site-identity";

export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  // Allow crawling so engines can see admin/demo noindex metadata.
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_ORIGIN}/sitemap.xml` };
}
