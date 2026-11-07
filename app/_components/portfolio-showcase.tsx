"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortfolioProject } from "@/app/_components/portfolio-project";
import { PublicGoodNotice } from "@/app/_components/public-good-notice";
import type { SiteWithStatus } from "@/app/_lib/site-mappers";
import { SiteCover } from "@/app/_components/site-cover";
import { usePortfolioData } from "@/app/_components/portfolio-data";

interface PortfolioShowcaseProps {
  sites: SiteWithStatus[];
}

export function PortfolioShowcase({ sites }: PortfolioShowcaseProps) {
  const orderedSites = useMemo(() => [...sites].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder), [sites]);
  const { selectedId, selectSite } = usePortfolioData();
  const [direction, setDirection] = useState(1);
  const [showPublicGood, setShowPublicGood] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const showcaseRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const wheelLockUntil = useRef(0);
  const wheelDelta = useRef(0);
  const lastWheelAt = useRef(0);
  const pageCount = orderedSites.length;
  const activeIndex = Math.max(0, orderedSites.findIndex((site) => site.id === selectedId));
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  const goTo = useCallback((next: number) => {
    if (!pageCount) return;
    setDirection(next >= activeIndexRef.current ? 1 : -1);
    const index = (next + pageCount) % pageCount;
    activeIndexRef.current = index;
    selectSite(orderedSites[index].id);
  }, [pageCount, orderedSites, selectSite]);

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('.project-flip[data-flipped="true"]')) { touchStart.current = null; return; }
    const touch = event.changedTouches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const delta = touch.clientX - start.x;
    if (Math.abs(delta) > 48 && Math.abs(delta) > Math.abs(touch.clientY - start.y)) goTo(activeIndex + (delta < 0 ? 1 : -1));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof Element && event.target.closest('.project-flip[data-flipped="true"]')) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
        event.preventDefault();
        goTo(activeIndex + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goTo]);

  useEffect(() => {
    const showcase = showcaseRef.current;
    if (!showcase || pageCount < 2) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (event.target instanceof Element && event.target.closest('.project-flip[data-flipped="true"]')) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil.current) {
        wheelLockUntil.current = Math.max(wheelLockUntil.current, now + 180);
        return;
      }
      if (now - lastWheelAt.current > 180 || Math.sign(delta) !== Math.sign(wheelDelta.current)) wheelDelta.current = 0;
      lastWheelAt.current = now;
      wheelDelta.current += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? showcase.clientHeight : 1);
      if (Math.abs(wheelDelta.current) < 24) return;
      const step = wheelDelta.current > 0 ? 1 : -1;
      goTo(activeIndexRef.current + step);
      wheelDelta.current = 0;
      wheelLockUntil.current = now + 700;
    };
    showcase.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      showcase.removeEventListener("wheel", onWheel);
    };
  }, [pageCount, goTo]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.project-flip[data-flipped="true"]')) { reset(); return; }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        stage.style.setProperty("--tilt-x", `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 2}deg`);
        stage.style.setProperty("--tilt-y", `${(event.clientX - rect.left - rect.width / 2) / rect.width * 3}deg`);
      });
    };
    const reset = () => { cancelAnimationFrame(frame); stage.style.setProperty("--tilt-x", "0deg"); stage.style.setProperty("--tilt-y", "0deg"); };
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", reset);
    return () => { cancelAnimationFrame(frame); stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", reset); };
  }, [pageCount]);

  if (!pageCount) {
    return <p className="portfolio-empty">暂时还没有公开展示的网站</p>;
  }

  return (
    <>
      <section ref={showcaseRef} className="portfolio-showcase" aria-label="网站作品">
        <div className="works-page-status" aria-live="polite">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <span className="works-page-status__rule" />
          <span>{String(pageCount).padStart(2, "0")}</span>
          <span className="works-page-status__name">{orderedSites[activeIndex]?.name}</span>
        </div>
        <div className="works-spatial-stage" ref={stageRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {pageCount > 1 ? ([-1, 1] as const).map((offset) => {
            const site = orderedSites[(activeIndex + offset + pageCount) % pageCount];
            return <button key={offset} type="button" className={`works-side-cover is-${offset < 0 ? "previous" : "next"}`}
              onClick={() => goTo(activeIndex + offset)} aria-label={`${offset < 0 ? "上一件" : "下一件"}：${site.name}`}>
              <SiteCover url={site.coverUrl} name={site.name} decorative />
              <span>{site.name} <b aria-hidden="true">{offset < 0 ? "↙" : "↗"}</b></span>
            </button>;
          }) : null}
          <div className="works-page-card" key={orderedSites[activeIndex]?.id} data-direction={direction}>
            <PortfolioProject site={orderedSites[activeIndex]} featured />
          </div>
        </div>
        <div className="works-page-controls">
          <button type="button" disabled={pageCount < 2} onClick={() => goTo(activeIndex - 1)} aria-label="上一件作品" title="上一件作品">←</button>
          <div className="works-page-dots" aria-label="选择作品">
            {orderedSites.map((site, dotIndex) => (
              <button
                key={site.id}
                type="button"
                className={dotIndex === activeIndex ? "is-active" : ""}
                aria-label={`第 ${dotIndex + 1} 件：${site.name}`}
                aria-current={dotIndex === activeIndex ? "step" : undefined}
                onClick={() => goTo(dotIndex)}
              />
            ))}
          </div>
          <button type="button" disabled={pageCount < 2} onClick={() => goTo(activeIndex + 1)} aria-label="下一件作品" title="下一件作品">→</button>
        </div>
        <p className="works-page-hint">滚轮、方向键或下方箭头翻页</p>
      </section>
      <footer className="works-footer">
        <span>每一个页面，都是正在运行的作品。</span>
        <button type="button" aria-expanded={showPublicGood} onClick={() => setShowPublicGood((shown) => !shown)}>{showPublicGood ? "收起公益关注 −" : "公益关注 +"}</button>
      </footer>
      {showPublicGood ? <PublicGoodNotice /> : null}
    </>
  );
}
