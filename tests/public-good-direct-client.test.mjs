import { describe, it } from "node:test";
import assert from "node:assert/strict";

function makePublicGoodApiResponse(overrides = {}) {
  return {
    success: true,
    data: {
      id: "448061",
      name: " 李瑾怡 ",
      sex: "女",
      birth_time: "2013-02-15",
      lost_time: "2018-08-01",
      child_pic: "https://assets.example.com/child.jpg",
      lost_place: "湖北省荆州市监利县容城镇",
      url: "https://example.com/detail",
      child_feature: " 穿黄色外套，留短发 ",
      ignored_raw_field: "must not leak",
      ...overrides,
    },
  };
}

function createStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
    removeItem(key) {
      entries.delete(key);
    },
    dump() {
      return Object.fromEntries(entries);
    },
  };
}

describe("browser direct public-good client", () => {
  it("collects up to five validated records from the direct browser API and stores only normalized real cache", async () => {
    const {
      PUBLIC_GOOD_DIRECT_CONFIG,
      refreshPublicGoodDirect,
    } = await import(`../app/_lib/public-good-direct.ts?direct-${Date.now()}`);
    const responses = [
      makePublicGoodApiResponse({
        id: "448061",
        name: `  ${"李".repeat(45)}  `,
        url: "http://example.com/not-https",
        lost_place: `湖北${"省".repeat(200)}`,
        child_feature: "特征".repeat(160),
      }),
      makePublicGoodApiResponse({ id: "448061", name: "重复数据" }),
      makePublicGoodApiResponse({ id: "448062", name: "王小明" }),
      makePublicGoodApiResponse({ id: "448063", name: "陈小花" }),
      makePublicGoodApiResponse({ id: "448064", name: "赵小安" }),
      makePublicGoodApiResponse({ id: "448065", name: "周小宁" }),
    ];
    const requestedUrls = [];
    const requestSignals = [];
    const pauses = [];
    const storage = createStorage();
    const now = 1_800_000_000_000;

    const result = await refreshPublicGoodDirect({
      fetcher: async (url, init) => {
        requestedUrls.push(String(url));
        requestSignals.push(init?.signal);
        return Response.json(responses[requestedUrls.length - 1]);
      },
      now: () => now,
      sleep: async (delay) => {
        pauses.push(delay);
      },
      storage,
    });

    assert.equal(result.displayable, true);
    assert.equal(result.items.length, 5);
    assert.deepEqual(requestedUrls, [
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
      PUBLIC_GOOD_DIRECT_CONFIG.apiUrl,
    ]);
    assert.ok(requestSignals.every((signal) => signal instanceof AbortSignal));
    assert.ok(
      pauses.every((delay) => delay === PUBLIC_GOOD_DIRECT_CONFIG.pauseMs)
    );
    assert.deepEqual(
      result.items.map((item) => item.id),
      ["448061", "448062", "448063", "448064", "448065"]
    );
    assert.equal(result.items[0].name.length, 40);
    assert.equal(result.items[0].name.startsWith(" "), false);
    assert.equal(result.items[0].detailUrl, null);
    assert.equal(result.items[0].lostPlace.length, 120);
    assert.equal(result.items[0].childFeature.length, 240);
    assert.equal("child_pic" in result.items[0], false);
    assert.equal("url" in result.items[0], false);

    const cached = JSON.parse(
      storage.getItem(PUBLIC_GOOD_DIRECT_CONFIG.cacheKey)
    );
    assert.equal(cached.version, PUBLIC_GOOD_DIRECT_CONFIG.cacheVersion);
    assert.equal(cached.savedAt, now);
    assert.equal(cached.expiresAt, now + PUBLIC_GOOD_DIRECT_CONFIG.cacheTtlMs);
    assert.deepEqual(cached.items, result.items);
  });

  it("stops after two consecutive failures and returns no displayable result when no real cache exists", async () => {
    const {
      PUBLIC_GOOD_DIRECT_CONFIG,
      refreshPublicGoodDirect,
    } = await import(`../app/_lib/public-good-direct.ts?fail-${Date.now()}`);
    const requestedUrls = [];
    const storage = createStorage();

    const result = await refreshPublicGoodDirect({
      fetcher: async (url) => {
        requestedUrls.push(String(url));
        throw new Error("upstream unavailable");
      },
      storage,
      sleep: async () => {},
    });

    assert.equal(result.displayable, false);
    assert.deepEqual(result.items, []);
    assert.equal(result.cacheState, "none");
    assert.equal(requestedUrls.length, 2);
    assert.equal(
      storage.getItem(PUBLIC_GOOD_DIRECT_CONFIG.cacheKey),
      null
    );
  });

  it("counts unsuccessful API responses as consecutive failures", async () => {
    const { refreshPublicGoodDirect } = await import(
      `../app/_lib/public-good-direct.ts?bad-response-${Date.now()}`
    );
    const requestedUrls = [];

    const result = await refreshPublicGoodDirect({
      fetcher: async (url) => {
        requestedUrls.push(String(url));
        return Response.json({ success: false });
      },
      storage: createStorage(),
      sleep: async () => {},
    });

    assert.equal(result.displayable, false);
    assert.equal(result.cacheState, "none");
    assert.equal(requestedUrls.length, 2);
  });

  it("keeps historical real cache displayable when refresh fails after the cache expires", async () => {
    const {
      PUBLIC_GOOD_DIRECT_CONFIG,
      refreshPublicGoodDirect,
    } = await import(`../app/_lib/public-good-direct.ts?cache-${Date.now()}`);
    const savedAt = 1_800_000_000_000;
    const cachedItem = {
      id: "448061",
      name: "李瑾怡",
      sex: "女",
      birthTime: "2013-02-15",
      lostTime: "2018-08-01",
      childPic: "https://assets.example.com/child.jpg",
      lostPlace: "湖北省荆州市监利县容城镇",
      childFeature: "穿黄色外套",
      detailUrl: "https://example.com/detail",
    };
    const storage = createStorage({
      [PUBLIC_GOOD_DIRECT_CONFIG.cacheKey]: JSON.stringify({
        version: PUBLIC_GOOD_DIRECT_CONFIG.cacheVersion,
        savedAt,
        expiresAt: savedAt - 1,
        items: [cachedItem],
      }),
    });

    const result = await refreshPublicGoodDirect({
      fetcher: async () => {
        throw new Error("still blocked");
      },
      now: () => savedAt + PUBLIC_GOOD_DIRECT_CONFIG.cacheTtlMs,
      storage,
      sleep: async () => {},
    });

    assert.equal(result.displayable, true);
    assert.equal(result.cacheState, "stale");
    assert.deepEqual(result.items, [cachedItem]);
  });
});
