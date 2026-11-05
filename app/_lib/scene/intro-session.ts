// This state lasts for one document. A reload creates a new session; Next.js
// client navigation keeps it, so returning home never restarts the tutorial.
export function createIntroSession(duration = 5) {
  let remaining = duration;
  let startedAt: number | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const finish = () => {
    clearInterval(timer);
    timer = undefined;
    remaining = 0;
    notify();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => remaining,
    getServerSnapshot: () => duration,
    getProgress: () => remaining === 0 ? 1 : startedAt !== null ? Math.min(1, (Date.now() - startedAt) / (duration * 1000)) : 0,
    start() {
      if (startedAt !== null || remaining === 0) return;
      startedAt = Date.now();
      timer = setInterval(() => {
        const next = Math.max(0, duration - Math.floor((Date.now() - startedAt!) / 1000));
        if (next === 0) finish();
        else if (next !== remaining) {
          remaining = next;
          notify();
        }
      }, 100);
    },
    finish,
  };
}

export const introSession = createIntroSession();
