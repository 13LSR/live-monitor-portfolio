"use client";

import { useState } from "react";
import { IFRAME_BASE_HEIGHT, IFRAME_BASE_WIDTH, IFRAME_SCALE } from "@/app/_lib/constants";
import { StatusPill } from "@/app/_components/status-pill";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface LiveProjectCardProps {
  site: SiteWithStatus;
  featured?: boolean;
}

export function LiveProjectCard({ site, featured = false }: LiveProjectCardProps) {
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState({
    enabled: false,
    siteKey: "",
  });
  const frameScale = featured ? 0.32 : IFRAME_SCALE;
  const interactionSiteKey = `${site.id}:${site.url}:${site.allowInteraction}`;
  const frameLoaded = loadedFrameUrl === site.url;
  const interactionEnabled =
    site.allowInteraction &&
    interactionState.enabled &&
    interactionState.siteKey === interactionSiteKey;
  const isOffline = site.status.isOnline === false;
  const canToggleInteraction = site.allowInteraction;

  return (
    <article
      className={`group flex overflow-hidden border border-[var(--line)] bg-[var(--paper-raised)] shadow-[8px_8px_0_rgba(31,37,35,0.2)] transition duration-200 hover:-translate-y-1 hover:shadow-[10px_10px_0_rgba(31,37,35,0.24)] ${
        featured ? "min-h-[560px] flex-col" : "min-h-[430px] flex-col"
      }`}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--line)] bg-[#f7d879] px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line)] bg-[var(--red)]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line)] bg-[var(--amber)]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line)] bg-[var(--green)]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--ink)] md:text-base">
              {site.name}
            </h2>
            <p className="truncate font-mono text-[11px] text-[var(--muted)]">
              {site.slug}
            </p>
          </div>
        </div>
        <StatusPill
          isOnline={site.status.isOnline}
          latency={site.status.latency}
          hasMonitorKey={site.status.hasMonitorKey}
          monitorDataLoaded={site.status.monitorDataLoaded}
          monitorMatched={site.status.monitorMatched}
        />
      </div>
      <div
        className={`relative flex flex-1 items-center justify-center overflow-hidden bg-[#dfe7dd] ${
          featured ? "min-h-[390px]" : "min-h-[280px]"
        }`}
      >
        <div
          className="relative overflow-hidden border border-[var(--line)] bg-white shadow-[6px_6px_0_rgba(31,37,35,0.18)] transition duration-300 group-hover:shadow-[8px_8px_0_rgba(31,37,35,0.24)]"
          style={{
            width: `${IFRAME_BASE_WIDTH * frameScale}px`,
            height: `${IFRAME_BASE_HEIGHT * frameScale}px`,
          }}
        >
          <iframe
            title={site.name}
            src={site.url}
            loading="lazy"
            onLoad={() => setLoadedFrameUrl(site.url)}
            className={`absolute left-0 top-0 origin-top-left ${
              interactionEnabled ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{
              width: `${IFRAME_BASE_WIDTH}px`,
              height: `${IFRAME_BASE_HEIGHT}px`,
              transform: `scale(${frameScale})`,
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,250,240,0.12),transparent_45%,rgba(31,37,35,0.1))]" />
        {!frameLoaded ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#fffaf0]/72 backdrop-blur-sm">
            <div className="flex items-center gap-3 border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-2 font-mono text-xs uppercase text-[var(--ink)] shadow-[5px_5px_0_rgba(31,37,35,0.2)]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--green)]" />
              加载网站中
            </div>
          </div>
        ) : null}
        {isOffline ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1f2523]/78 px-6 text-center text-[#fffaf0] backdrop-blur-sm">
            <div className="border border-[#fffaf0] bg-[var(--red)] px-3 py-1 font-mono text-xs uppercase">
              暂时无法访问
            </div>
            <p className="max-w-sm text-sm leading-6">
              这个网站当前访问异常，稍后可以再试。
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 border-t border-[var(--line)] bg-[var(--paper-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
          {site.description}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canToggleInteraction ? (
            <button
              type="button"
              aria-pressed={interactionEnabled}
              onClick={() =>
                setInteractionState((current) => ({
                  enabled:
                    current.siteKey === interactionSiteKey
                      ? !current.enabled
                      : true,
                  siteKey: interactionSiteKey,
                }))
              }
              className={`border px-3 py-2 text-xs font-semibold transition ${
                interactionEnabled
                  ? "border-[var(--line)] bg-[var(--green)] text-[#fffaf0]"
                  : "border-[var(--line)] bg-[#fffaf0] text-[var(--ink)] hover:bg-[#e7eadf]"
              }`}
            >
              {interactionEnabled ? "关闭交互" : "开启交互"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.open(site.url, "_blank", "noopener,noreferrer")}
            className="border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-[#fffaf0] transition hover:bg-[var(--green)]"
          >
            访问网站
          </button>
        </div>
      </div>
    </article>
  );
}
