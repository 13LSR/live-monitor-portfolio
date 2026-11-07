import type { Metadata } from "next";
import { SITE_NAME, SITE_ORIGIN, SOCIAL_IMAGE } from "../../shared/site-identity.ts";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_ORIGIN).href;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "website", locale: "zh_CN", siteName: SITE_NAME, title, description, url, images: [SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SOCIAL_IMAGE.url] },
  };
}
