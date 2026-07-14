"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";

interface PortfolioProjectProps {
  site: SiteWithStatus;
  featured?: boolean;
}

function getStatusLabel(site: SiteWithStatus) {
  if (!site.status.hasMonitorKey) return "状态未接入";
  if (!site.status.monitorDataLoaded) return "检测中";
  if (!site.status.monitorMatched) return "状态未知";
  if (site.status.isOnline === false) return "已离线";
  if (site.status.isOnline === true) return "运行中";
  return "状态未知";
}

export function PortfolioProject({
  site,
  featured = false,
}: PortfolioProjectProps) {
  const projectRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const frameLoaded = loadedFrameUrl === site.url;
  const isOffline = site.status.isOnline === false;
  const fallbackVisitUrl = site.fallbackUrl ?? site.url;
  const visitUrl = site.fallbackUrl && (isOffline || !frameLoaded)
    ? fallbackVisitUrl
    : site.url;
  const statusTone = !site.status.hasMonitorKey
    ? "is-muted"
    : site.status.isOnline === true
      ? "is-online"
      : site.status.isOnline === false
        ? "is-offline"
        : "is-unknown";
  const summary = site.summary || site.description;
  const visibleTags = site.tags.slice(0, featured ? 4 : 3);
  const visibleTechStack = site.techStack.slice(0, featured ? 5 : 3);

  useEffect(() => {
    const node = projectRef.current;
    if (!node) return;

    if (typeof window.IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.unobserve(node);
      },
      { threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={projectRef}
      className={`portfolio-project${isVisible ? " is-visible" : ""}${
        featured ? " is-featured" : ""
      }`}
    >
      <header className="portfolio-project__chrome">
        <span className="portfolio-project__traffic-lights" aria-hidden="true">
          <span className="is-red" />
          <span className="is-amber" />
          <span className="is-green" />
        </span>
        <div className="portfolio-project__identity">
          <h2>{site.name}</h2>
          <p>{site.slug}</p>
        </div>
        <div className={`portfolio-project__status ${statusTone}`} role="status">
          <span className="portfolio-project__status-indicator" aria-hidden="true">
            {site.status.isOnline === true ? (
              <span className="portfolio-project__status-pulse" />
            ) : null}
            <span className="portfolio-project__status-dot" />
          </span>
          <span>{getStatusLabel(site)}</span>
          {site.status.isOnline === true && site.status.latency !== null ? (
            <span className="portfolio-project__latency">
              {site.status.latency}ms
            </span>
          ) : null}
        </div>
      </header>
      <div className="portfolio-project__preview">
        <iframe
          title={site.name}
          src={site.url}
          loading="lazy"
          onLoad={() => setLoadedFrameUrl(site.url)}
          className={interactionEnabled ? "is-interactive" : ""}
        />
        {!frameLoaded ? (
          <div className="portfolio-project__message" aria-live="polite">
            正在载入网站预览，入口仍可直接访问。
          </div>
        ) : null}
        {isOffline ? (
          <div className="portfolio-project__message is-offline" aria-live="polite">
            网站暂时无法访问，已保留备用入口。
          </div>
        ) : null}
      </div>
      <div className="portfolio-project__info">
        <div className="portfolio-project__details">
          {featured ? <p className="portfolio-project__eyebrow">精选作品</p> : null}
          <p className="portfolio-project__summary">{summary}</p>
          {visibleTags.length > 0 || visibleTechStack.length > 0 ? (
            <div className="portfolio-project__metadata">
              {visibleTags.length > 0 ? (
                <div className="portfolio-project__meta-group" aria-label="作品标签">
                  {visibleTags.map((tag) => (
                    <span key={tag} className="portfolio-project__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {visibleTechStack.length > 0 ? (
                <div className="portfolio-project__meta-group" aria-label="技术栈">
                  {visibleTechStack.map((tech) => (
                    <span key={tech} className="portfolio-project__tech">
                      {tech}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="portfolio-project__actions">
          {site.repoUrl ? (
            <a href={site.repoUrl} target="_blank" rel="noreferrer">
              查看源码
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          {site.allowInteraction ? (
            <button
              type="button"
              aria-pressed={interactionEnabled}
              onClick={() => setInteractionEnabled((enabled) => !enabled)}
            >
              {interactionEnabled ? "关闭预览交互" : "开启预览交互"}
            </button>
          ) : null}
          <a
            href={visitUrl}
            target="_blank"
            rel="noreferrer"
            className="portfolio-project__visit"
          >
            打开网站
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
