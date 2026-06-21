"use client";

import { useState } from "react";
import { IFRAME_BASE_HEIGHT, IFRAME_BASE_WIDTH, IFRAME_SCALE } from "@/app/_lib/constants";
import { StatusPill } from "@/app/_components/status-pill";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface LiveProjectCardProps {
  site: SiteWithStatus;
}

export function LiveProjectCard({ site }: LiveProjectCardProps) {
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState({
    enabled: false,
    siteKey: "",
  });
  const interactionSiteKey = `${site.id}:${site.url}:${site.allowInteraction}`;
  const frameLoaded = loadedFrameUrl === site.url;
  const interactionEnabled =
    site.allowInteraction &&
    interactionState.enabled &&
    interactionState.siteKey === interactionSiteKey;
  const isOffline = site.status.isOnline === false;
  const canToggleInteraction = site.allowInteraction;

  return (
    <article className="group relative min-h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/30">
      <StatusPill
        isOnline={site.status.isOnline}
        latency={site.status.latency}
        hasMonitorKey={site.status.hasMonitorKey}
        monitorDataLoaded={site.status.monitorDataLoaded}
        monitorMatched={site.status.monitorMatched}
      />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/85 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400 backdrop-blur-md">
        <span>{site.name}</span>
        <span>{site.slug}</span>
      </div>
      <div className="absolute inset-0 top-[49px] overflow-hidden bg-slate-900">
        <iframe
          title={site.name}
          src={site.url}
          loading="lazy"
          onLoad={() => setLoadedFrameUrl(site.url)}
          className={`absolute left-0 top-0 origin-top-left transition-transform duration-500 group-hover:scale-[0.255] ${
            interactionEnabled ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            width: `${IFRAME_BASE_WIDTH}px`,
            height: `${IFRAME_BASE_HEIGHT}px`,
            transform: `scale(${IFRAME_SCALE})`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_40%)]" />
        {!frameLoaded ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/78 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 shadow-xl">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
              加载网站中
            </div>
          </div>
        ) : null}
        {isOffline ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/72 px-6 text-center backdrop-blur-sm">
            <div className="rounded-full border border-rose-500/35 bg-rose-500/12 px-3 py-1 text-xs uppercase tracking-[0.22em] text-rose-200">
              暂时无法访问
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-300">
              这个网站当前访问异常，稍后可以再试。
            </p>
          </div>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-3 border-t border-white/10 bg-slate-950/88 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-slate-300">{site.description}</p>
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
              className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] transition ${
                interactionEnabled
                  ? "border-emerald-300/60 bg-emerald-300/16 text-emerald-100"
                  : "border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              {interactionEnabled ? "关闭交互" : "开启交互"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.open(site.url, "_blank", "noopener,noreferrer")}
            className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/18"
          >
            访问网站
          </button>
        </div>
      </div>
    </article>
  );
}
