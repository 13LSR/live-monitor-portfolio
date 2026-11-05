"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePortfolioData } from "@/app/_components/portfolio-data";
import { SiteCover } from "@/app/_components/site-cover";

// Adapted visual rhythm from ThreeUI's Falling Diagonal: a tilted orbit,
// twelve plates, two headline lines and eased hover motion. Covers are DOM
// images so image hosts without WebGL CORS support remain usable.
export function HomeGallery({ active }: { active: boolean }) {
  const { sites, selectSite } = usePortfolioData();
  const galleryRef = useRef<HTMLDivElement>(null);
  const ordered = [...sites].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder);
  const visible = ordered.slice(0, 12);
  const count = visible.length ? Math.max(8, visible.length) : 0;

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !active || !count) return;
    const orbit = gallery.querySelector<HTMLElement>(".gallery-orbit")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let angle = 16;
    let speed = 0;
    let hovered = false;
    let inView = true;
    const drag = { id: -1, start: 0, last: 0, moved: false };
    const render = () => orbit.style.setProperty("--orbit", `${angle}deg`);
    const tick = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, 0.04);
      previous = now;
      const target = hovered && drag.id === -1 ? 24 : 0;
      speed += (target - speed) * (1 - Math.exp(-4 * dt));
      angle += speed * dt;
      render();
      if (target || Math.abs(speed) > 0.03) frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const start = () => {
      if (!frame && !document.hidden && inView && !reduced.matches) { previous = 0; frame = requestAnimationFrame(tick); }
    };
    const enter = () => { hovered = true; start(); };
    const leave = () => { hovered = false; };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag.id = event.pointerId; drag.start = drag.last = event.clientX; drag.moved = false;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      if (Math.abs(event.clientX - drag.start) > 6) drag.moved = true;
      if (drag.moved) { gallery.setPointerCapture(event.pointerId); angle += (event.clientX - drag.last) * 0.35; speed = 0; render(); }
      drag.last = event.clientX;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      drag.id = -1;
      if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    };
    const click = (event: MouseEvent) => {
      if (drag.moved) { event.preventDefault(); event.stopPropagation(); drag.moved = false; }
    };
    const visibility = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (!document.hidden) start();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start(); else { cancelAnimationFrame(frame); frame = 0; }
    });
    observer.observe(gallery);
    render();
    gallery.addEventListener("pointerenter", enter);
    gallery.addEventListener("pointerleave", leave);
    gallery.addEventListener("pointerdown", down);
    gallery.addEventListener("pointermove", move);
    gallery.addEventListener("pointerup", up);
    gallery.addEventListener("pointercancel", up);
    gallery.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", visibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gallery.removeEventListener("pointerenter", enter);
      gallery.removeEventListener("pointerleave", leave);
      gallery.removeEventListener("pointerdown", down);
      gallery.removeEventListener("pointermove", move);
      gallery.removeEventListener("pointerup", up);
      gallery.removeEventListener("pointercancel", up);
      gallery.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", visibility);
    };
  }, [active, count]);

  return <div className="home-gallery-anchor" inert={!active}>
    <div ref={galleryRef} className="home-gallery" aria-label="网站封面环形图库">
      <div className="gallery-orbit">
        {Array.from({ length: count }, (_, index) => {
          const site = visible[index % visible.length];
          const duplicate = index >= visible.length;
          return <Link key={`${site.id}-${index}`} href="/works" className="gallery-plate"
            style={{ transform: `translate(-50%, -50%) rotateY(${index / count * 360}deg) translateZ(280px)` }}
            aria-label={`浏览作品：${site.name}`} aria-hidden={duplicate || undefined}
            tabIndex={duplicate ? -1 : 0} onClick={() => selectSite(site.id)}>
            <SiteCover url={site.coverUrl} name={site.name} decorative eager />
            <span>{site.name}</span>
          </Link>;
        })}
      </div>
      <div className="gallery-title">
        <span>小想法</span><strong>大世界。</strong>
      </div>
    </div>
  </div>;
}
