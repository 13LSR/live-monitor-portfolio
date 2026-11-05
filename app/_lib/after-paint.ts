interface PaintScheduler {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
}

// Two frames let the lightweight UI paint before starting expensive modules.
export function afterPaint(callback: () => void, scheduler: PaintScheduler = window) {
  let cancelled = false;
  let frame = scheduler.requestAnimationFrame(() => {
    if (cancelled) return;
    frame = scheduler.requestAnimationFrame(() => { if (!cancelled) callback(); });
  });
  return () => { cancelled = true; scheduler.cancelAnimationFrame(frame); };
}
