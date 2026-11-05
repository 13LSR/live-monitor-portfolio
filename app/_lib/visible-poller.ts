type VisibilitySource = Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;

export function startVisiblePolling(
  task: (signal: AbortSignal) => Promise<void>,
  options: {
    visibility: VisibilitySource;
    intervalMs?: number;
    onError?: (error: unknown) => void;
  }
) {
  const { visibility, intervalMs = 60_000, onError } = options;
  let stopped = false;
  let running = false;
  let refreshPending = false;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  async function run() {
    if (stopped || visibility.hidden) return;
    if (running) {
      refreshPending = true;
      return;
    }
    clearTimer();
    running = true;
    const current = new AbortController();
    controller = current;
    try {
      await task(current.signal);
    } catch (error) {
      if (!current.signal.aborted) onError?.(error);
    } finally {
      running = false;
      controller = null;
      if (!stopped && !visibility.hidden) {
        if (refreshPending) {
          refreshPending = false;
          void run();
        } else {
          timer = setTimeout(() => void run(), intervalMs);
        }
      }
    }
  }

  function onVisibilityChange() {
    clearTimer();
    if (visibility.hidden) {
      refreshPending = false;
      controller?.abort();
    } else {
      void run();
    }
  }

  visibility.addEventListener("visibilitychange", onVisibilityChange);
  void run();
  return () => {
    stopped = true;
    clearTimer();
    controller?.abort();
    visibility.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
