"use client";

import { useEffect, useRef, useState } from "react";
import { previewLoadQueue } from "@/app/_lib/preview-load-queue";

interface ProjectPreviewProps {
  site: { name: string; url: string };
  active: boolean;
  interactionEnabled: boolean;
  onLoadedChange: (loaded: boolean) => void;
}

export function ProjectPreview({ active, ...props }: ProjectPreviewProps) {
  const [attempt, setAttempt] = useState(0);
  if (!active) {
    return <div className="portfolio-project__message">预览将在滚动到此处时加载。</div>;
  }
  return <QueuedFrame key={`${props.site.url}:${attempt}`} {...props} onRetry={() => setAttempt((value) => value + 1)} />;
}

function QueuedFrame({
  site,
  interactionEnabled,
  onLoadedChange,
  onRetry,
}: Omit<ProjectPreviewProps, "active"> & { onRetry: () => void }) {
  const [admitted, setAdmitted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const ticketRef = useRef<ReturnType<typeof previewLoadQueue.request> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishedRef = useRef(false);

  useEffect(() => {
    let active = true;
    finishedRef.current = false;
    const updateVisibility = () => previewLoadQueue.setPaused(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    const ticket = previewLoadQueue.request(() => {
      if (!active) return;
      setAdmitted(true);
      timeoutRef.current = setTimeout(() => {
        finishedRef.current = true;
        setTimedOut(true);
        ticket.release();
      }, 20_000);
    });
    ticketRef.current = ticket;
    return () => {
      active = false;
      clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", updateVisibility);
      ticket.release();
      onLoadedChange(false);
    };
  }, [onLoadedChange]);

  function handleLoad() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimeout(timeoutRef.current);
    ticketRef.current?.release();
    setLoaded(true);
    onLoadedChange(true);
  }

  return (
    <>
      {admitted && !timedOut ? (
        <iframe
          title={site.name}
          src={site.url}
          loading="lazy"
          inert={!interactionEnabled}
          tabIndex={interactionEnabled ? 0 : -1}
          onLoad={handleLoad}
          className={interactionEnabled ? "is-interactive" : ""}
        />
      ) : null}
      {!loaded ? (
        <div className="portfolio-project__message" aria-live="polite">
          {timedOut ? (
            <span>预览载入超时，仍可直接打开网站。 <button type="button" onClick={onRetry}>重新加载预览</button></span>
          ) : admitted ? "正在载入网站预览，入口仍可直接访问。" : "正在准备网站预览..."}
        </div>
      ) : null}
    </>
  );
}
