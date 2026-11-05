"use client";

import { useState } from "react";
import { DEFAULT_COVER_URL, resolveCoverUrl } from "@/shared/site-cover";

export function SiteCover({ url, name, decorative = false, eager = false }: {
  url?: string | null;
  name: string;
  decorative?: boolean;
  eager?: boolean;
}) {
  const source = resolveCoverUrl(url);
  const [failed, setFailed] = useState<string[]>([]);
  const current = failed.includes(source) ? DEFAULT_COVER_URL : source;
  if (failed.includes(current)) {
    return <span className="site-cover-fallback" role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${name}封面暂不可用`}>{name}<small>SELECTED WORK</small></span>;
  }
  // External image hosts need no CORS headers when rendered as DOM images.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={current} alt={decorative ? "" : `${name}封面`} loading={eager ? "eager" : "lazy"}
    decoding="async" referrerPolicy="no-referrer" draggable={false}
    onError={() => setFailed((urls) => [...urls, current])} />;
}
