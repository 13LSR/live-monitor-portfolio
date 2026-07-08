"use client";

import { useState } from "react";
import { Button, Tag } from "animal-island-ui";
import { StatusPill } from "@/app/_components/status-pill";
import {
  IFRAME_BASE_HEIGHT,
  IFRAME_BASE_WIDTH,
  IFRAME_SCALE,
} from "@/app/_lib/constants";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface LiveProjectCardProps {
  site: SiteWithStatus;
  featured?: boolean;
}

export function LiveProjectCard({
  site,
  featured = false,
}: LiveProjectCardProps) {
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState({
    enabled: false,
    siteKey: "",
  });
  const frameScale = featured ? 0.32 : IFRAME_SCALE;
  const isOffline = site.status.isOnline === false;
  const frameUrl = site.url;
  const interactionSiteKey = `${site.id}:${frameUrl}:${site.allowInteraction}`;
  const frameLoaded = loadedFrameUrl === frameUrl;
  const shouldUseFallbackVisit =
    site.fallbackUrl && (isOffline || !frameLoaded);
  const fallbackVisitUrl = site.fallbackUrl ?? site.url;
  const visitUrl = shouldUseFallbackVisit ? fallbackVisitUrl : site.url;
  const interactionEnabled =
    site.allowInteraction &&
    interactionState.enabled &&
    interactionState.siteKey === interactionSiteKey;
  const hasUnknownState =
    site.status.isOnline === null && site.status.hasMonitorKey;
  const isNotConnected = !site.status.hasMonitorKey;
  const canToggleInteraction = site.allowInteraction;
  const summary = site.summary || site.description;
  const visibleTags = site.tags.slice(0, 4);
  const visibleTechStack = site.techStack.slice(0, 5);
  const repoUrl = site.repoUrl;

  return (
    <article
      className={`island-project-card group flex overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[#fff7df] shadow-[0_18px_0_rgba(31,37,35,0.16)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_0_rgba(31,37,35,0.2)] ${
        featured ? "min-h-[520px] flex-col" : "min-h-[390px] flex-col"
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
        className={`relative flex flex-1 items-center justify-center overflow-hidden bg-[#dfe7dd] p-3 ${
          featured ? "min-h-[320px] md:min-h-[390px]" : "min-h-[250px]"
        }`}
      >
        <div
          className="relative aspect-[16/9] w-full max-w-[680px] overflow-hidden border border-[var(--line)] bg-white shadow-[6px_6px_0_rgba(31,37,35,0.18)] transition duration-300 group-hover:shadow-[8px_8px_0_rgba(31,37,35,0.24)]"
          style={{
            width: `${IFRAME_BASE_WIDTH * frameScale}px`,
            maxWidth: "100%",
          }}
        >
          <iframe
            title={site.name}
            src={frameUrl}
            loading="lazy"
            onLoad={() => setLoadedFrameUrl(frameUrl)}
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
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#fffaf0]/72 p-4 backdrop-blur-sm">
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
              这个网站当前访问异常，入口仍保留，可以稍后再试。
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 border-t border-[var(--line)] bg-[var(--paper-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {summary}
          </p>
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <Tag
                  key={tag}
                  color="app-yellow"
                  variant="outlined"
                  size="small"
                  className="max-w-full break-words"
                >
                  {tag}
                </Tag>
              ))}
            </div>
          ) : null}
          {visibleTechStack.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleTechStack.map((tech) => (
                <Tag
                  key={tech}
                  color="app-teal"
                  variant="dashed"
                  size="small"
                  className="max-w-full break-words font-mono uppercase"
                >
                  {tech}
                </Tag>
              ))}
            </div>
          ) : null}
          {hasUnknownState || isNotConnected ? (
            <p className="font-mono text-[11px] uppercase text-[var(--muted)]">
              {isNotConnected ? "状态未接入" : "状态未知"}，作品入口仍可访问。
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {repoUrl ? (
            <Button
              htmlType="button"
              type="default"
              size="small"
              onClick={() =>
                window.open(repoUrl, "_blank", "noopener,noreferrer")
              }
              className="shrink-0 whitespace-nowrap"
            >
              查看源码
            </Button>
          ) : null}
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
            onClick={() =>
              window.open(visitUrl, "_blank", "noopener,noreferrer")
            }
            className="border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-[#fffaf0] transition hover:bg-[var(--green)]"
          >
            访问网站
          </button>
        </div>
      </div>
    </article>
  );
}
