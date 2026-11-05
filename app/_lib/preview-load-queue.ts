export function createPreviewLoadQueue(limit = 2) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid preview concurrency");
  type Entry = { start: () => void; released: boolean };
  const waiting: Entry[] = [];
  const loading = new Set<Entry>();
  let paused = false;

  function drain() {
    while (!paused && loading.size < limit && waiting.length > 0) {
      const entry = waiting.shift()!;
      if (entry.released) continue;
      loading.add(entry);
      entry.start();
    }
  }

  return {
    request(start: () => void) {
      const entry: Entry = { start, released: false };
      waiting.push(entry);
      queueMicrotask(drain);
      return {
        release() {
          if (entry.released) return;
          entry.released = true;
          loading.delete(entry);
          const index = waiting.indexOf(entry);
          if (index !== -1) waiting.splice(index, 1);
          queueMicrotask(drain);
        },
      };
    },
    setPaused(value: boolean) {
      paused = value;
      if (!paused) queueMicrotask(drain);
    },
  };
}

export const previewLoadQueue = createPreviewLoadQueue(2);
