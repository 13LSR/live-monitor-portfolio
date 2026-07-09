import type { PublicGoodPerson } from "../../shared/contracts";

type PublicGoodApiItem = {
  id?: unknown;
  name?: unknown;
  sex?: unknown;
  birth_time?: unknown;
  lost_time?: unknown;
  child_pic?: unknown;
  lost_place?: unknown;
  url?: unknown;
  child_feature?: unknown;
};

type PublicGoodApiResponse = {
  success?: unknown;
  data?: PublicGoodApiItem;
};

type PublicGoodCache = {
  version?: unknown;
  savedAt?: unknown;
  expiresAt?: unknown;
  items?: unknown;
};

type PublicGoodCacheState = "fresh" | "stale" | "refreshed" | "none";

export type PublicGoodDirectResult = {
  success: true;
  displayable: boolean;
  items: PublicGoodPerson[];
  contacts: null;
  sourceName: string;
  sourceApi: string;
  cachedAt: string;
  cacheTtlSeconds: number;
  isFallback: false;
  cacheState: PublicGoodCacheState;
  message?: string;
};

type PublicGoodStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type RefreshPublicGoodOptions = {
  fetcher?: typeof fetch;
  storage?: PublicGoodStorage | null;
  now?: () => number;
  sleep?: (delay: number, signal: AbortSignal) => Promise<void>;
};

type CachedPublicGood = {
  fresh: boolean;
  items: PublicGoodPerson[];
  savedAt: number;
};

export const PUBLIC_GOOD_DIRECT_CONFIG = {
  apiUrl: "https://api.isoyu.com/gy/api.php",
  cacheKey: "public-good-real-cache-v2",
  cacheVersion: 2,
  cacheTtlMs: 1000 * 60 * 60 * 6,
  itemCount: 5,
  maxAttempts: 8,
  maxConsecutiveFailures: 2,
  pauseMs: 180,
  timeoutMs: 6500,
  sourceName: "姬长信API",
} as const;

export async function refreshPublicGoodDirect(
  options: RefreshPublicGoodOptions = {}
): Promise<PublicGoodDirectResult> {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const storage = options.storage ?? getBrowserStorage();
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? wait;
  const cached = readCachedPublicGood(storage, now());

  if (cached?.fresh) {
    return toResult(cached.items, {
      cacheState: "fresh",
      cachedAt: new Date(cached.savedAt).toISOString(),
    });
  }

  const refreshedItems = await collectPublicGoodItems(fetcher, sleep);

  if (refreshedItems.length > 0) {
    writeCachedPublicGood(storage, refreshedItems, now());
    return toResult(refreshedItems, {
      cacheState: "refreshed",
      cachedAt: new Date(now()).toISOString(),
    });
  }

  if (cached?.items.length) {
    return toResult(cached.items, {
      cacheState: "stale",
      cachedAt: new Date(cached.savedAt).toISOString(),
      message: "公益接口暂时不可用，继续展示历史真实缓存。",
    });
  }

  return {
    success: true,
    displayable: false,
    items: [],
    contacts: null,
    sourceName: PUBLIC_GOOD_DIRECT_CONFIG.sourceName,
    sourceApi: PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
    cachedAt: new Date(0).toISOString(),
    cacheTtlSeconds: PUBLIC_GOOD_DIRECT_CONFIG.cacheTtlMs / 1000,
    isFallback: false,
    cacheState: "none",
    message: "公益接口暂时不可用，且没有历史真实缓存。",
  };
}

async function collectPublicGoodItems(
  fetcher: typeof fetch,
  sleep: (delay: number, signal: AbortSignal) => Promise<void>
) {
  const items: PublicGoodPerson[] = [];
  const seenIds = new Set<string>();
  let consecutiveFailures = 0;

  for (let attempt = 0; attempt < PUBLIC_GOOD_DIRECT_CONFIG.maxAttempts; attempt += 1) {
    if (items.length >= PUBLIC_GOOD_DIRECT_CONFIG.itemCount) {
      break;
    }

    try {
      const item = await fetchPublicGoodItem(fetcher);
      consecutiveFailures = 0;

      if (item && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    } catch {
      consecutiveFailures += 1;

      if (
        consecutiveFailures >=
        PUBLIC_GOOD_DIRECT_CONFIG.maxConsecutiveFailures
      ) {
        break;
      }
    }

    if (
      attempt < PUBLIC_GOOD_DIRECT_CONFIG.maxAttempts - 1 &&
      items.length < PUBLIC_GOOD_DIRECT_CONFIG.itemCount
    ) {
      await sleep(PUBLIC_GOOD_DIRECT_CONFIG.pauseMs, new AbortController().signal);
    }
  }

  return items;
}

async function fetchPublicGoodItem(fetcher: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PUBLIC_GOOD_DIRECT_CONFIG.timeoutMs
  );

  try {
    const response = await fetcher(PUBLIC_GOOD_DIRECT_CONFIG.apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Public-good API failed: ${response.status}`);
    }

    const payload = (await response.json()) as PublicGoodApiResponse;

    if (payload.success !== true) {
      throw new Error("Public-good API returned an unsuccessful response");
    }

    const item = normalizePublicGoodItem(payload.data);

    if (!item) {
      throw new Error("Public-good API returned an invalid record");
    }

    return item;
  } finally {
    clearTimeout(timeout);
  }
}

function readCachedPublicGood(
  storage: PublicGoodStorage | null,
  now: number
): CachedPublicGood | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(PUBLIC_GOOD_DIRECT_CONFIG.cacheKey);

    if (!raw) {
      return null;
    }

    const cache = JSON.parse(raw) as PublicGoodCache;
    const items = Array.isArray(cache.items)
      ? cache.items.map(normalizePublicGoodPerson).filter(isPublicGoodPerson)
      : [];
    const savedAt = Number(cache.savedAt);
    const expiresAt = Number(cache.expiresAt);

    if (
      cache.version !== PUBLIC_GOOD_DIRECT_CONFIG.cacheVersion ||
      !items.length ||
      !Number.isFinite(savedAt) ||
      !Number.isFinite(expiresAt)
    ) {
      return null;
    }

    return {
      fresh: expiresAt > now,
      items,
      savedAt,
    };
  } catch {
    return null;
  }
}

function writeCachedPublicGood(
  storage: PublicGoodStorage | null,
  items: PublicGoodPerson[],
  savedAt: number
) {
  if (!storage || !items.length) {
    return;
  }

  try {
    storage.setItem(
      PUBLIC_GOOD_DIRECT_CONFIG.cacheKey,
      JSON.stringify({
        version: PUBLIC_GOOD_DIRECT_CONFIG.cacheVersion,
        savedAt,
        expiresAt: savedAt + PUBLIC_GOOD_DIRECT_CONFIG.cacheTtlMs,
        items,
      })
    );
  } catch {
    // Storage is an enhancement; the in-memory result remains usable.
  }
}

function normalizePublicGoodItem(
  raw: PublicGoodApiItem | undefined
): PublicGoodPerson | null {
  const id = normalizeRequiredText(raw?.id, 80);
  const name = normalizeRequiredText(raw?.name, 40);
  const childPic = normalizeImageUrl(raw?.child_pic);

  if (!id || !name || !childPic) {
    return null;
  }

  return {
    id,
    name,
    sex: normalizeOptionalText(raw?.sex, 16),
    birthTime: normalizeOptionalText(raw?.birth_time, 64),
    lostTime: normalizeOptionalText(raw?.lost_time, 64),
    childPic,
    lostPlace: normalizeOptionalText(raw?.lost_place, 120),
    childFeature: normalizeOptionalText(raw?.child_feature, 240),
    detailUrl: normalizeHttpsUrl(raw?.url),
  };
}

function normalizePublicGoodPerson(raw: unknown): PublicGoodPerson | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const person = raw as Partial<PublicGoodPerson>;
  const id = normalizeRequiredText(person.id, 80);
  const name = normalizeRequiredText(person.name, 40);
  const childPic = normalizeImageUrl(person.childPic);

  if (!id || !name || !childPic) {
    return null;
  }

  return {
    id,
    name,
    sex: normalizeOptionalText(person.sex, 16),
    birthTime: normalizeOptionalText(person.birthTime, 64),
    lostTime: normalizeOptionalText(person.lostTime, 64),
    childPic,
    lostPlace: normalizeOptionalText(person.lostPlace, 120),
    childFeature: normalizeOptionalText(person.childFeature, 240),
    detailUrl: normalizeHttpsUrl(person.detailUrl),
  };
}

function normalizeRequiredText(value: unknown, maxLength: number) {
  const text = normalizeOptionalText(value, maxLength);
  return text || null;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, maxLength)
    : "";
}

function normalizeImageUrl(value: unknown) {
  const url = normalizeOptionalText(value, 500);

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeHttpsUrl(value: unknown) {
  const url = normalizeOptionalText(value, 500);

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function isPublicGoodPerson(
  value: PublicGoodPerson | null
): value is PublicGoodPerson {
  return value !== null;
}

function toResult(
  items: PublicGoodPerson[],
  options: {
    cacheState: Exclude<PublicGoodCacheState, "none">;
    cachedAt: string;
    message?: string;
  }
): PublicGoodDirectResult {
  return {
    success: true,
    displayable: items.length > 0,
    items: items.slice(0, PUBLIC_GOOD_DIRECT_CONFIG.itemCount),
    contacts: null,
    sourceName: PUBLIC_GOOD_DIRECT_CONFIG.sourceName,
    sourceApi: PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
    cachedAt: options.cachedAt,
    cacheTtlSeconds: PUBLIC_GOOD_DIRECT_CONFIG.cacheTtlMs / 1000,
    isFallback: false,
    cacheState: options.cacheState,
    message: options.message,
  };
}

function getBrowserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function wait(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeout = setTimeout(resolve, delay);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
