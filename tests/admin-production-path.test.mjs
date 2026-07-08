import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { getFriendlyApiErrorMessage } from "../app/_lib/api-errors.ts";
import { demoSites } from "../app/_data/demo-sites.ts";
import {
  addUniqueListValue,
  buildSitePayloadForSubmit,
  createSlugFromSiteInput,
  getNextSlugValue,
  removeListValue,
  validateAdminSitePayload,
} from "../app/_lib/site-form-utils.ts";
import {
  createCollectionSummary,
  filterSitesByCategory,
  splitFeaturedSites,
} from "../app/_lib/portfolio-summary.ts";
import {
  getSiteMutationErrorMessage,
  getSitePayloadValidationError,
  mapSiteRowToSiteRecord,
  normalizeSitePayloadForStorage,
  parsePortfolioStringArray,
} from "../worker/src/site-validation.ts";
import { insertSite, listSites, updateSiteById } from "../worker/src/db.ts";
import { handleGetSites } from "../worker/src/routes/sites.ts";
import worker from "../worker/src/index.ts";

const root = process.cwd();

describe("admin production API path", () => {
  it("derives homepage collection summary and category filters on the client", () => {
    const sites = [
      makeSite({ id: 1, category: "web", isOnline: true }),
      makeSite({ id: 2, category: "tool", isOnline: false }),
      makeSite({ id: 3, category: "landing", isOnline: null }),
      makeSite({ id: 4, category: "other", isOnline: null }),
    ];

    assert.deepEqual(createCollectionSummary(sites), {
      total: 4,
      online: 1,
      unknown: 2,
    });
    assert.deepEqual(
      filterSitesByCategory(sites, "all").map((site) => site.id),
      [1, 2, 3, 4]
    );
    assert.deepEqual(
      filterSitesByCategory(sites, "tool").map((site) => site.id),
      [2]
    );
    assert.deepEqual(splitFeaturedSites(sites).featuredSite.id, 1);
    assert.deepEqual(
      splitFeaturedSites([
        makeSite({ id: 1, category: "web", isOnline: true }),
        makeSite({
          id: 2,
          category: "web",
          isOnline: true,
          isFeatured: true,
        }),
        makeSite({
          id: 3,
          category: "web",
          isOnline: true,
          isFeatured: true,
        }),
      ]),
      {
        featuredSite: makeSite({
          id: 2,
          category: "web",
          isOnline: true,
          isFeatured: true,
        }),
        ordinarySites: [
          makeSite({ id: 1, category: "web", isOnline: true }),
          makeSite({
            id: 3,
            category: "web",
            isOnline: true,
            isFeatured: true,
          }),
        ],
      }
    );
  });

  it("keeps homepage brand and featured site as first-viewport anchors", () => {
    const homePage = readFileSync(
      join(root, "app/_components/home-page.tsx"),
      "utf8"
    );
    const bentoGrid = readFileSync(
      join(root, "app/_components/bento-grid.tsx"),
      "utf8"
    );

    assert.match(homePage, /小茄的网站小岛/);
    assert.match(homePage, /正在运行的网站作品/);
    assert.match(bentoGrid, /splitFeaturedSites\(sites\)/);
    assert.match(bentoGrid, /<LiveProjectCard site=\{featuredSite\} featured/);
  });

  it("selects featured portfolio cards and renders lightweight metadata", () => {
    const bentoGrid = readFileSync(
      join(root, "app/_components/bento-grid.tsx"),
      "utf8"
    );
    const card = readFileSync(
      join(root, "app/_components/live-project-card.tsx"),
      "utf8"
    );

    assert.match(bentoGrid, /splitFeaturedSites\(sites\)/);
    assert.match(bentoGrid, /ordinarySites/);
    assert.doesNotMatch(
      bentoGrid,
      /const \[featuredSite, \.\.\.otherSites\] = sites/
    );
    assert.match(card, /site\.summary \|\| site\.description/);
    assert.match(card, /site\.tags\.slice\(0,\s*4\)/);
    assert.match(card, /site\.techStack\.slice\(0,\s*5\)/);
    assert.match(card, /site\.repoUrl/);
    assert.match(card, /site\.fallbackUrl/);
    assert.match(card, /const frameUrl = site\.url/);
    assert.match(
      card,
      /site\.fallbackUrl && \(isOffline \|\| !frameLoaded\)/
    );
    assert.match(card, /const fallbackVisitUrl = site\.fallbackUrl \?\? site\.url/);
    assert.match(
      card,
      /const visitUrl = shouldUseFallbackVisit \? fallbackVisitUrl : site\.url/
    );
    assert.match(card, /<iframe/);
    assert.match(card, /src=\{frameUrl\}/);
  });

  it("uses animal-island-ui for homepage metadata without taking over live card logic", () => {
    const card = readFileSync(
      join(root, "app/_components/live-project-card.tsx"),
      "utf8"
    );

    assert.match(card, /from "animal-island-ui"/);
    assert.match(card, /\bButton\b/);
    assert.match(card, /\bTag\b/);
    assert.match(card, /visibleTags\.map\([\s\S]*<Tag/);
    assert.match(card, /visibleTechStack\.map\([\s\S]*<Tag/);
    assert.match(card, /<Button[\s\S]*查看源码[\s\S]*<\/Button>/);
    assert.match(card, /flex-wrap/);
    assert.match(card, /<iframe/);
    assert.match(card, /StatusPill/);
    assert.match(card, /window\.open\(visitUrl/);
    assert.match(card, /src=\{frameUrl\}/);
    assert.doesNotMatch(card, /worker\/|D1|listSites|handleGetSites/);
  });

  it("keeps live project cards as real iframe windows with safe interaction states", () => {
    const card = readFileSync(
      join(root, "app/_components/live-project-card.tsx"),
      "utf8"
    );
    const statusPill = readFileSync(
      join(root, "app/_components/status-pill.tsx"),
      "utf8"
    );

    assert.match(card, /<iframe/);
    assert.match(card, /loading="lazy"/);
    assert.match(card, /pointer-events-none/);
    assert.match(card, /site\.allowInteraction &&/);
    assert.match(card, /window\.open\(visitUrl/);
    assert.match(card, /加载网站中/);
    assert.match(card, /暂时无法访问/);
    assert.match(card, /访问网站/);
    assert.match(card, /aspect-\[16\/9\]/);
    assert.match(statusPill, /状态未接入/);
    assert.match(statusPill, /状态未知/);
  });

  it("keeps homepage behavior wired through the production page path", () => {
    const page = readFileSync(join(root, "app/page.tsx"), "utf8");
    const homePage = readFileSync(
      join(root, "app/_components/home-page.tsx"),
      "utf8"
    );
    const portfolio = readFileSync(
      join(root, "app/_components/portfolio-grid-client.tsx"),
      "utf8"
    );
    const bentoGrid = readFileSync(
      join(root, "app/_components/bento-grid.tsx"),
      "utf8"
    );

    assert.match(page, /return <HomePage \/>/);
    assert.match(homePage, /<PortfolioGridClient \/>/);
    assert.match(portfolio, /mergeSitesWithStatuses\(resolvedSites, monitorMap/);
    assert.match(portfolio, /mergeSitesWithStatuses\(resolvedSites, \{\}/);
    assert.match(
      portfolio,
      /setSites\(\s*mergeSitesWithStatuses\(resolvedSites, \{\}\)\s*\);\s*setIsLoading\(false\);\s*}\s*try \{\s*const monitorMap = await fetchMonitorMap\(\);/s
    );
    assert.doesNotMatch(portfolio, /setSites\(\[\]\);\s*setIsLoading\(false\);\s*}\s*catch \(error\) \{\s*console\.error\("无法获取监控数据"/s);
    assert.doesNotMatch(
      portfolio,
      /console\.warn\("监控数据暂时不可用，已使用未知状态。",\s*error\)/
    );
    assert.match(bentoGrid, /<LiveProjectCard/);
  });

  it("serves a sanitized five-person public-good batch through the Worker route and cache", async () => {
    const originalFetch = globalThis.fetch;
    const thirdPartyItems = [
      makePublicGoodApiResponse({
        id: "448061",
        name: `  ${"李".repeat(45)}  `,
        child_pic: "http://assets.example.com/not-https.jpg",
        url: "http://detail.example.com/not-https",
        lost_place: `湖北省${"荆州市".repeat(60)}`,
        child_feature: "穿黄色外套，".repeat(40),
      }),
      makePublicGoodApiResponse({
        id: "448061",
        name: "重复数据",
      }),
      makePublicGoodApiResponse({ id: "448062", name: "王小明" }),
      makePublicGoodApiResponse({ id: "448063", name: "陈小花" }),
      makePublicGoodApiResponse({ id: "448064", name: "赵小安" }),
      makePublicGoodApiResponse({ id: "448065", name: "周小宁" }),
    ];
    const requestedUrls = [];

    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));
      return Response.json(thirdPartyItems[requestedUrls.length - 1]);
    };

    try {
      const firstResponse = await worker.fetch(
        new Request("https://worker.example/public-good"),
        createPublicGoodEnv()
      );
      const firstBody = await firstResponse.json();

      assert.equal(firstResponse.status, 200);
      assert.equal(firstBody.success, true);
      assert.equal(firstBody.items.length, 5);
      assert.equal(firstBody.sourceName, "姬长信API");
      assert.equal(firstBody.sourceApi, "https://api.isoyu.com/gy/api.php");
      assert.equal(firstBody.cacheTtlSeconds, 21600);
      assert.equal(firstBody.isFallback, false);
      assert.deepEqual(firstBody.contacts, {
        consultMail: "baobeihuijia@yeah.net",
        tel: "0435-3338090",
      });
      assert.equal(requestedUrls.length, 6);
      assert.ok(
        requestedUrls.every(
          (url) => url === "https://api.isoyu.com/gy/api.php"
        )
      );
      assert.deepEqual(
        firstBody.items.map((item) => item.id),
        ["448061", "448062", "448063", "448064", "448065"]
      );
      assert.equal(firstBody.items[0].name.length, 40);
      assert.equal(firstBody.items[0].name.startsWith(" "), false);
      assert.equal(firstBody.items[0].childPic, null);
      assert.equal(firstBody.items[0].detailUrl, null);
      assert.equal(firstBody.items[0].lostPlace.length, 120);
      assert.equal(firstBody.items[0].childFeature.length, 240);
      assert.equal("data" in firstBody, false);
      assert.equal("child_pic" in firstBody.items[0], false);
      assert.equal("url" in firstBody.items[0], false);

      const cachedResponse = await worker.fetch(
        new Request("https://worker.example/public-good"),
        createPublicGoodEnv()
      );
      const cachedBody = await cachedResponse.json();

      assert.equal(cachedResponse.status, 200);
      assert.equal(requestedUrls.length, 6);
      assert.deepEqual(cachedBody, firstBody);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("serves a local public-good fixture without calling the third-party API", async () => {
    const originalFetch = globalThis.fetch;
    const { getPublicGoodBatch } = await import(
      `../worker/src/public-good.ts?fixture-${Date.now()}`
    );
    const fixtureResponses = [
      makePublicGoodApiResponse({ id: "448061", name: "李瑾怡" }),
      makePublicGoodApiResponse({ id: "448062", name: "王小明" }),
      makePublicGoodApiResponse({ id: "448063", name: "陈小花" }),
      makePublicGoodApiResponse({ id: "448064", name: "赵小安" }),
      makePublicGoodApiResponse({ id: "448065", name: "周小宁" }),
    ];

    globalThis.fetch = async () => {
      throw new Error("Fixture mode should not request the third-party API");
    };

    try {
      const batch = await getPublicGoodBatch(
        createPublicGoodEnv({
          PUBLIC_GOOD_FIXTURE_JSON: JSON.stringify(fixtureResponses),
        })
      );

      assert.equal(batch.success, true);
      assert.equal(batch.items.length, 5);
      assert.equal(batch.isFallback, false);
      assert.equal(batch.sourceName, "姬长信API");
      assert.equal(batch.items[0].name, "李瑾怡");
      assert.equal(batch.items[0].lostPlace, "湖北省荆州市监利县容城镇");
      assert.equal(batch.items[0].detailUrl, "https://example.com/detail");
      assert.equal("data" in batch, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses the documented public-good sample on localhost when the upstream returns a Cloudflare challenge", async () => {
    const originalFetch = globalThis.fetch;
    const { handlePublicGood } = await import(
      `../worker/src/public-good.ts?local-challenge-${Date.now()}`
    );

    globalThis.fetch = async () =>
      new Response("<!DOCTYPE html><title>Just a moment...</title>", {
        status: 403,
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });

    try {
      const response = await handlePublicGood(
        new Request("http://localhost:8787/public-good"),
        createPublicGoodEnv()
      );
      const batch = await response.json();

      assert.equal(response.status, 200);
      assert.equal(batch.success, true);
      assert.equal(batch.items.length, 5);
      assert.equal(batch.items[0].id, "448061");
      assert.equal(batch.items[0].name, "李瑾怡");
      assert.equal(batch.items[0].lostPlace, "湖北省荆州市监利县容城镇");
      assert.equal(batch.sourceName, "姬长信API 文档示例");
      assert.equal(batch.isFallback, true);
      assert.match(batch.message, /本地验证/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not reuse localhost public-good sample cache for non-local Worker requests", async () => {
    const originalFetch = globalThis.fetch;
    const { handlePublicGood } = await import(
      `../worker/src/public-good.ts?cache-scope-${Date.now()}`
    );
    const liveResponses = [
      makePublicGoodApiResponse({ id: "448061", name: "李瑾怡" }),
      makePublicGoodApiResponse({ id: "448062", name: "王小明" }),
      makePublicGoodApiResponse({ id: "448063", name: "陈小花" }),
      makePublicGoodApiResponse({ id: "448064", name: "赵小安" }),
      makePublicGoodApiResponse({ id: "448065", name: "周小宁" }),
    ];
    let requestCount = 0;

    globalThis.fetch = async () => {
      requestCount += 1;

      if (requestCount <= 8) {
        return new Response("<!DOCTYPE html><title>Just a moment...</title>", {
          status: 403,
          headers: { "Content-Type": "text/html; charset=UTF-8" },
        });
      }

      return Response.json(liveResponses[requestCount - 9]);
    };

    try {
      const localResponse = await handlePublicGood(
        new Request("http://localhost:8787/public-good"),
        createPublicGoodEnv()
      );
      const localBatch = await localResponse.json();

      assert.equal(localBatch.sourceName, "姬长信API 文档示例");
      assert.equal(localBatch.isFallback, true);

      const productionResponse = await handlePublicGood(
        new Request("https://worker.example/public-good"),
        createPublicGoodEnv()
      );
      const productionBatch = await productionResponse.json();

      assert.equal(productionBatch.sourceName, "姬长信API");
      assert.equal(productionBatch.isFallback, false);
      assert.deepEqual(
        productionBatch.items.map((item) => item.id),
        ["448061", "448062", "448063", "448064", "448065"]
      );
      assert.equal(requestCount, 13);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("filters invalid public-good API structures and falls back after eight refresh attempts", async () => {
    const originalFetch = globalThis.fetch;
    const { getPublicGoodBatch } = await import(
      `../worker/src/public-good.ts?invalid-${Date.now()}`
    );
    const requestedUrls = [];

    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));
      return Response.json(
        {
          ...makePublicGoodApiResponse({
            id: "should-not-render",
            name: "不应展示",
          }),
          success: false,
        }
      );
    };

    try {
      const batch = await getPublicGoodBatch(createPublicGoodEnv());

      assert.equal(requestedUrls.length, 8);
      assert.equal(batch.success, true);
      assert.equal(batch.items.length, 5);
      assert.equal(batch.isFallback, true);
      assert.match(batch.message, /备用数据/);
      assert.equal(
        batch.items.some((item) => item.id === "should-not-render"),
        false
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetches public-good data through the frontend API client with local fallback", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const apiClientSource = readFileSync(
      join(root, "app/_lib/api-client.ts"),
      "utf8"
    );
    const requestedUrls = [];

    process.env.NEXT_PUBLIC_API_BASE_URL = "https://worker.example";
    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));
      throw new Error("Worker unavailable");
    };

    try {
      const apiClient = await import(
        `../app/_lib/api-client.ts?public-good-${Date.now()}`
      );

      assert.equal(typeof apiClient.getPublicGood, "function");

      const batch = await apiClient.getPublicGood();

      assert.deepEqual(requestedUrls, [
        "https://worker.example/public-good",
      ]);
      assert.equal(batch.success, true);
      assert.equal(batch.items.length, 5);
      assert.equal(batch.isFallback, true);
      assert.match(batch.message, /本地备用/);
      assert.equal(apiClientSource.includes("api.isoyu.com"), false);
    } finally {
      globalThis.fetch = originalFetch;

      if (originalApiBase === undefined) {
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
      } else {
        process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
      }
    }
  });

  it("wires the public-good notice into the homepage before the portfolio list", () => {
    const homePage = readFileSync(
      join(root, "app/_components/home-page.tsx"),
      "utf8"
    );
    const noticePath = join(root, "app/_components/public-good-notice.tsx");

    assert.match(homePage, /PublicGoodNotice/);
    assert.match(homePage, /<PublicGoodNotice[\s\S]*<PortfolioGridClient/);
    assert.equal(existsSync(noticePath), true);

    const notice = readFileSync(noticePath, "utf8");

    assert.match(notice, /"use client"/);
    assert.match(notice, /getPublicGood/);
    assert.match(notice, /getPublicGoodFallbackBatch/);
    assert.match(notice, /公益公告/);
    assert.match(notice, /batch\.items\.slice\(0,\s*5\)/);
    assert.match(notice, /onMouseEnter/);
    assert.match(notice, /onClick/);
    assert.match(notice, /selectedPerson/);
    assert.match(notice, /childPic/);
    assert.match(notice, /PublicGoodPhoto/);
    assert.match(notice, /暂无照片/);
    assert.match(notice, /detailUrl/);
    assert.match(notice, /查看详情/);
    assert.match(notice, /from "animal-island-ui"/);
  });

  it("strengthens the homepage as an Animal Island surface without making status a dashboard", () => {
    const homePage = readFileSync(
      join(root, "app/_components/home-page.tsx"),
      "utf8"
    );
    const card = readFileSync(
      join(root, "app/_components/live-project-card.tsx"),
      "utf8"
    );
    const portfolio = readFileSync(
      join(root, "app/_components/portfolio-grid-client.tsx"),
      "utf8"
    );

    assert.match(homePage, /island-hero/);
    assert.match(homePage, /作品小岛/);
    assert.match(homePage, /岛上公告/);
    assert.match(homePage, /aria-label="小岛状态说明"/);
    assert.doesNotMatch(homePage, /Total|Online|Unknown/);
    assert.doesNotMatch(portfolio, />\s*Total\s*</);
    assert.doesNotMatch(portfolio, />\s*Online\s*</);
    assert.doesNotMatch(portfolio, />\s*Unknown\s*</);
    assert.match(portfolio, /岛上现在有/);
    assert.match(portfolio, /座小屋亮着灯/);
    assert.match(card, /island-project-card/);
    assert.match(card, /rounded-\[1\.5rem\]/);
    assert.match(card, /bg-\[#fff7df\]/);
    assert.match(card, /shadow-\[0_18px_0/);
    assert.match(card, /StatusPill/);
    assert.match(card, /<iframe/);
    assert.match(card, /loading="lazy"/);
  });

  it("presents the authenticated admin as an island office without hiding CRUD controls", () => {
    const dashboard = readFileSync(
      join(root, "app/_components/admin-dashboard.tsx"),
      "utf8"
    );
    const table = readFileSync(
      join(root, "app/_components/admin-site-table.tsx"),
      "utf8"
    );

    assert.match(dashboard, /from "animal-island-ui"/);
    assert.match(dashboard, /岛务管理所/);
    assert.match(dashboard, /管理岛上的网站小屋/);
    assert.match(dashboard, /<Card/);
    assert.match(dashboard, /<Button/);
    assert.match(dashboard, /<Tag/);
    assert.match(dashboard, /onClick=\{\(\) => void handleLogout\(\)\}/);
    assert.match(table, /from "animal-island-ui"/);
    assert.match(table, /岛上站点/);
    assert.match(table, /<Card/);
    assert.match(table, /<Button/);
    assert.match(table, /编辑/);
    assert.match(table, /打开站点/);
    assert.match(table, /确认删除/);
    assert.match(table, /取消删除/);
    assert.match(table, /md:hidden/);
    assert.match(table, /hidden md:block/);
    assert.doesNotMatch(table, /overflow-x-auto/);
  });

  it("keeps animal-island-ui root style import and durable non-commercial attribution", () => {
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const styleImportMatches =
      layout.match(/import "animal-island-ui\/style"/g) ?? [];

    assert.equal(styleImportMatches.length, 1);
    assert.match(readme, /animal-island-ui/);
    assert.match(readme, /CC-BY-NC-4\.0/);
    assert.match(readme, /非商业/);
    assert.match(readme, /商业化/);
  });

  it("keeps monitor fetching bounded so public sites are not hidden by a slow status source", () => {
    const uptimeflare = readFileSync(
      join(root, "app/_lib/uptimeflare.ts"),
      "utf8"
    );

    assert.match(uptimeflare, /MONITOR_FETCH_TIMEOUT_MS = 15_000/);
    assert.match(uptimeflare, /new AbortController\(\)/);
    assert.match(uptimeflare, /signal: controller\.signal/);
    assert.match(uptimeflare, /finally \{\s*clearTimeout\(timeoutId\);\s*}/s);
    assert.match(uptimeflare, /clearTimeout\(timeoutId\)/);
  });

  it("accepts either a UptimeFlare origin or the full /api/data endpoint", () => {
    const uptimeflare = readFileSync(
      join(root, "app/_lib/uptimeflare.ts"),
      "utf8"
    );

    assert.match(uptimeflare, /export function resolveMonitorApiUrl/);
    assert.match(uptimeflare, /url\.pathname = "\/api\/data"/);
    assert.match(uptimeflare, /!pathname\.endsWith\("\/api\/data"\)/);
    assert.match(uptimeflare, /url\.pathname = `\$\{pathname\}\/api\/data`/);
  });

  it("keeps animal-island-ui spike scoped to root style and admin login", () => {
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    );
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    const login = readFileSync(
      join(root, "app/_components/admin-login-form.tsx"),
      "utf8"
    );

    assert.equal(pkg.dependencies["animal-island-ui"], "^1.2.0");
    assert.match(layout, /import "animal-island-ui\/style";/);
    assert.match(login, /from "animal-island-ui"/);
    assert.match(login, /<Card/);
    assert.match(login, /<Input/);
    assert.match(login, /<Button/);
  });

  it("applies the Phase 4 portfolio migration without changing existing rows", () => {
    const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
    const initialMigration = readFileSync(
      join(root, "worker/migrations/0001_init.sql"),
      "utf8"
    );
    const portfolioMigration = readFileSync(
      join(root, "worker/migrations/0002_portfolio_fields.sql"),
      "utf8"
    );
    const migrationFiles = readdirSync(join(root, "worker/migrations"));
    const statements = portfolioMigration
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    assert.match(nextConfig, /output:\s*"export"/);
    assert.doesNotMatch(
      initialMigration,
      /summary|tags|is_featured|tech_stack|repo_url|fallback_url/
    );
    assert.deepEqual(migrationFiles, [
      "0001_init.sql",
      "0002_portfolio_fields.sql",
    ]);
    assert.ok(statements.length > 0);
    assert.equal(
      statements.every((statement) =>
        /^ALTER TABLE sites ADD COLUMN /i.test(statement)
      ),
      true
    );
    assert.doesNotMatch(
      portfolioMigration,
      /CREATE\s+INDEX|UPDATE\s+sites|INSERT\s+INTO/i
    );

    const db = new DatabaseSync(":memory:");
    db.exec(initialMigration);
    db.exec(`
      INSERT INTO sites (
        name,
        slug,
        url,
        category,
        created_at,
        updated_at
      ) VALUES (
        'Old Site',
        'old-site',
        'https://old.example.com',
        'web',
        '2026-07-08T00:00:00.000Z',
        '2026-07-08T00:00:00.000Z'
      );
    `);
    db.exec(portfolioMigration);

    const columns = db
      .prepare("PRAGMA table_info(sites)")
      .all()
      .map((column) => column.name);
    assert.deepEqual(
      [
        "summary",
        "tags",
        "tech_stack",
        "is_featured",
        "repo_url",
        "fallback_url",
      ].every((column) => columns.includes(column)),
      true
    );
    const existingRow = db
      .prepare(
        `SELECT summary, tags, tech_stack, is_featured, repo_url, fallback_url
           FROM sites
           WHERE slug = 'old-site'`
      )
      .get();
    assert.deepEqual(
      Object.fromEntries(Object.entries(existingRow)),
      {
        summary: "",
        tags: "[]",
        tech_stack: "[]",
        is_featured: 0,
        repo_url: null,
        fallback_url: null,
      }
    );
    db.close();
  });

  it("keeps Phase 4 portfolio fields in the shared camelCase contract", () => {
    const sharedTypes = readFileSync(join(root, "shared/types.ts"), "utf8");
    const sharedContracts = readFileSync(
      join(root, "shared/contracts.ts"),
      "utf8"
    );

    for (const field of [
      "summary",
      "tags",
      "techStack",
      "isFeatured",
      "repoUrl",
      "fallbackUrl",
    ]) {
      assert.match(sharedTypes, new RegExp(`\\b${field}\\b`));
      assert.match(sharedContracts, new RegExp(`\\b${field}\\b`));
    }
    assert.doesNotMatch(
      sharedTypes,
      /tech_stack|is_featured|repo_url|fallback_url/
    );
    assert.doesNotMatch(
      sharedContracts,
      /tech_stack|is_featured|repo_url|fallback_url/
    );

    for (const site of demoSites) {
      assert.equal(typeof site.summary, "string");
      assert.equal(Array.isArray(site.tags), true);
      assert.equal(Array.isArray(site.techStack), true);
      assert.equal(typeof site.isFeatured, "boolean");
      assert.equal(
        site.repoUrl === null || typeof site.repoUrl === "string",
        true
      );
      assert.equal(
        site.fallbackUrl === null || typeof site.fallbackUrl === "string",
        true
      );
    }
  });

  it("provides a local verifier without starting frontend or Worker services", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const verifier = readFileSync(
      join(root, "scripts/verify-local-e2e.mjs"),
      "utf8"
    );

    assert.equal(pkg.scripts["verify:local"], "node scripts/verify-local-e2e.mjs");
    assert.match(verifier, /This script never starts services/);
    assert.doesNotMatch(verifier, /spawn|exec|Start-Process|npm run dev|wrangler dev/);
    assert.match(verifier, /ADMIN_PASSWORD/);
    assert.match(verifier, /\/auth\/login/);
    assert.match(verifier, /\/sites\?includeHidden=1/);
  });

  it("generates slugs until the admin edits slug manually", () => {
    assert.equal(createSlugFromSiteInput("My Demo Site", ""), "my-demo-site");
    assert.equal(
      createSlugFromSiteInput("", "https://tools.example.com/path"),
      "tools-example-com"
    );
    assert.equal(
      getNextSlugValue({
        currentSlug: "custom-slug",
        name: "New Name",
        url: "https://new.example.com",
        slugEditedManually: true,
      }),
      "custom-slug"
    );
    assert.equal(
      getNextSlugValue({
        currentSlug: "",
        name: "New Name",
        url: "",
        slugEditedManually: false,
      }),
      "new-name"
    );
  });

  it("validates admin site payload before submitting to Worker", () => {
    const validPayload = {
      name: "Demo",
      slug: "demo",
      url: "https://example.com",
      monitorKey: "",
      category: "web",
      description: "",
      summary: "",
      tags: [],
      techStack: [],
      isFeatured: false,
      repoUrl: null,
      fallbackUrl: null,
      coverMode: "iframe",
      sortOrder: 0,
      isVisible: true,
      allowInteraction: false,
    };

    assert.equal(
      validateAdminSitePayload({ ...validPayload, name: " " }),
      "请填写站点名称。"
    );
    assert.equal(
      validateAdminSitePayload({ ...validPayload, slug: "" }),
      "请填写站点 slug。"
    );
    assert.equal(
      validateAdminSitePayload({ ...validPayload, url: "http://example.com" }),
      "网站地址必须以 https:// 开头。"
    );
    assert.equal(validateAdminSitePayload(validPayload), null);
    assert.deepEqual(buildSitePayloadForSubmit(validPayload), {
      ...validPayload,
      name: "Demo",
      slug: "demo",
      url: "https://example.com",
      monitorKey: null,
      description: "",
      summary: "",
      tags: [],
      techStack: [],
      repoUrl: null,
      fallbackUrl: null,
    });
    assert.deepEqual(
      buildSitePayloadForSubmit({
        ...validPayload,
        summary: "  Short  ",
        tags: [" React ", "", "Next", "React"],
        techStack: [" TypeScript ", "Next", "TypeScript"],
        repoUrl: " https://github.com/example/demo ",
        fallbackUrl: "",
      }),
      {
        ...validPayload,
        monitorKey: null,
        summary: "Short",
        tags: ["React", "Next"],
        techStack: ["TypeScript", "Next"],
        repoUrl: "https://github.com/example/demo",
        fallbackUrl: null,
      }
    );
    assert.equal(
      validateAdminSitePayload({
        ...validPayload,
        repoUrl: "http://github.com/example/demo",
      }),
      "源码链接必须以 https:// 开头。"
    );
    assert.equal(
      validateAdminSitePayload({ ...validPayload, fallbackUrl: "not-a-url" }),
      "请输入有效的 https:// 备用访问链接。"
    );
    assert.deepEqual(addUniqueListValue(["React"], " React "), ["React"]);
    assert.deepEqual(addUniqueListValue(["React"], " Next "), [
      "React",
      "Next",
    ]);
    assert.deepEqual(removeListValue(["React", "Next"], "React"), ["Next"]);
  });

  it("renders Phase 4 portfolio fields in the single admin editor panel", () => {
    const form = readFileSync(
      join(root, "app/_components/admin-site-form.tsx"),
      "utf8"
    );

    for (const label of [
      "作品信息",
      "作品简介",
      "标签",
      "技术栈",
      "源码链接",
      "备用访问链接",
      "首页精选",
    ]) {
      assert.match(form, new RegExp(label));
    }
    assert.match(form, /form\.summary/);
    assert.match(form, /form\.tags/);
    assert.match(form, /form\.techStack/);
    assert.match(form, /form\.repoUrl/);
    assert.match(form, /form\.fallbackUrl/);
    assert.match(form, /form\.isFeatured/);
    assert.match(form, /多个精选/);
    assert.doesNotMatch(form, /drag|auto recommendation|global tag/i);
  });

  it("uses animal-island-ui in the admin portfolio information section", () => {
    const form = readFileSync(
      join(root, "app/_components/admin-site-form.tsx"),
      "utf8"
    );

    assert.match(form, /from "animal-island-ui"/);
    assert.match(form, /<Card[\s\S]*作品信息/);
    assert.match(form, /<Button[\s\S]*添加/);
    assert.match(form, /<Tag[\s\S]*closable/);
    assert.match(form, /color="app-yellow"|color="app-teal"|color="app-green"/);
  });

  it("keeps Worker site validation specific enough for the admin UI", () => {
    assert.equal(
      getSitePayloadValidationError({
        name: "Demo",
        slug: "demo",
        url: "http://example.com",
      }),
      "Site URL must start with https://"
    );
    assert.equal(
      getSiteMutationErrorMessage(
        new Error("D1_ERROR: UNIQUE constraint failed: sites.slug"),
        "Failed to create site"
      ),
      "Duplicate slug"
    );
  });

  it("normalizes and validates Phase 4 portfolio fields at the Worker boundary", () => {
    const validPayload = {
      name: " Demo ",
      slug: " demo ",
      url: " https://example.com ",
      monitorKey: " example-monitor ",
      category: "web",
      description: " Description ",
      summary: " Portfolio summary ",
      tags: [" React ", "", "Next", "React"],
      techStack: [" TypeScript ", "Next", "TypeScript"],
      isFeatured: true,
      repoUrl: " https://github.com/example/demo ",
      fallbackUrl: "",
      coverMode: "iframe",
      sortOrder: 0,
      isVisible: true,
      allowInteraction: false,
    };

    assert.deepEqual(normalizeSitePayloadForStorage(validPayload), {
      name: "Demo",
      slug: "demo",
      url: "https://example.com",
      monitorKey: "example-monitor",
      category: "web",
      description: "Description",
      summary: "Portfolio summary",
      tagsJson: "[\"React\",\"Next\"]",
      techStackJson: "[\"TypeScript\",\"Next\"]",
      isFeaturedValue: 1,
      repoUrl: "https://github.com/example/demo",
      fallbackUrl: null,
      coverMode: "iframe",
      sortOrder: 0,
      isVisibleValue: 1,
      allowInteractionValue: 0,
    });
    assert.deepEqual(parsePortfolioStringArray("[\"A\",\"\",\"A\",\" B \"]"), [
      "A",
      "B",
    ]);
    assert.deepEqual(parsePortfolioStringArray("{bad json"), []);
    assert.deepEqual(parsePortfolioStringArray("[1,2]"), []);

    assert.equal(
      getSitePayloadValidationError({
        ...validPayload,
        summary: "x".repeat(121),
      }),
      "Summary must be 120 characters or fewer"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, tags: "React" }),
      "Tags must be an array"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, tags: [1] }),
      "Tags must contain only strings"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, techStack: "Next" }),
      "Tech stack must be an array"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, techStack: [{}] }),
      "Tech stack must contain only strings"
    );
    assert.equal(
      getSitePayloadValidationError({
        ...validPayload,
        repoUrl: "http://github.com/example/demo",
      }),
      "Repo URL must start with https://"
    );
    assert.equal(
      getSitePayloadValidationError({
        ...validPayload,
        fallbackUrl: "not-a-url",
      }),
      "Fallback URL must be a valid absolute URL"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, repoUrl: 42 }),
      "Repo URL must be a string or null"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, fallbackUrl: {} }),
      "Fallback URL must be a string or null"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, summary: undefined }),
      "Summary is required"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, tags: undefined }),
      "Tags must be an array"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, techStack: undefined }),
      "Tech stack must be an array"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, isFeatured: undefined }),
      "Featured flag is required"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, repoUrl: undefined }),
      "Repo URL field is required"
    );
    assert.equal(
      getSitePayloadValidationError({ ...validPayload, fallbackUrl: undefined }),
      "Fallback URL field is required"
    );
  });

  it("maps corrupt stored portfolio JSON to safe arrays for Worker list responses", () => {
    const mapped = mapSiteRowToSiteRecord({
      id: 1,
      name: "Demo",
      slug: "demo",
      url: "https://example.com",
      monitor_key: null,
      category: "web",
      description: "",
      summary: "A short summary",
      tags: "{bad json",
      tech_stack: "[\"React\",\" React \"]",
      is_featured: 1,
      repo_url: "",
      fallback_url: "https://fallback.example.com",
      cover_mode: "iframe",
      sort_order: 0,
      is_visible: 1,
      allow_interaction: 0,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    assert.deepEqual(mapped.tags, []);
    assert.deepEqual(mapped.techStack, ["React"]);
    assert.equal(mapped.isFeatured, true);
    assert.equal(mapped.repoUrl, null);
    assert.equal(mapped.fallbackUrl, "https://fallback.example.com");
  });

  it("persists Phase 4 portfolio fields through Worker DB helpers", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(join(root, "worker/migrations/0001_init.sql"), "utf8"));
    db.exec(
      readFileSync(
        join(root, "worker/migrations/0002_portfolio_fields.sql"),
        "utf8"
      )
    );
    const env = createSqliteD1Env(db);
    const payload = {
      name: " Demo ",
      slug: "demo",
      url: "https://example.com",
      monitorKey: null,
      category: "web",
      description: "",
      summary: " First summary ",
      tags: ["React", "Next", "React"],
      techStack: ["TypeScript"],
      isFeatured: true,
      repoUrl: "https://github.com/example/demo",
      fallbackUrl: "https://fallback.example.com",
      coverMode: "iframe",
      sortOrder: 1,
      isVisible: true,
      allowInteraction: false,
    };

    await insertSite(env, payload);

    let rows = await listSites(env);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].summary, "First summary");
    assert.equal(rows[0].tags, "[\"React\",\"Next\"]");
    assert.equal(rows[0].tech_stack, "[\"TypeScript\"]");
    assert.equal(rows[0].is_featured, 1);
    assert.equal(rows[0].repo_url, "https://github.com/example/demo");
    assert.equal(rows[0].fallback_url, "https://fallback.example.com");
    assert.deepEqual(mapSiteRowToSiteRecord(rows[0]).tags, ["React", "Next"]);

    await updateSiteById(env, rows[0].id, {
      ...payload,
      summary: " Updated ",
      tags: ["Design"],
      techStack: ["Cloudflare", "D1"],
      isFeatured: false,
      repoUrl: "",
      fallbackUrl: null,
    });

    rows = await listSites(env, true);
    assert.equal(rows[0].summary, "Updated");
    assert.equal(rows[0].tags, "[\"Design\"]");
    assert.equal(rows[0].tech_stack, "[\"Cloudflare\",\"D1\"]");
    assert.equal(rows[0].is_featured, 0);
    assert.equal(rows[0].repo_url, null);
    assert.equal(rows[0].fallback_url, null);
    db.close();
  });

  it("returns portfolio fields through the public Worker sites route", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(join(root, "worker/migrations/0001_init.sql"), "utf8"));
    db.exec(
      readFileSync(
        join(root, "worker/migrations/0002_portfolio_fields.sql"),
        "utf8"
      )
    );
    const env = createSqliteD1Env(db);

    await insertSite(env, {
      name: "Visible",
      slug: "visible",
      url: "https://visible.example.com",
      monitorKey: null,
      category: "web",
      description: "",
      summary: "Visible summary",
      tags: ["Live", "Portfolio"],
      techStack: ["D1"],
      isFeatured: true,
      repoUrl: "https://github.com/example/visible",
      fallbackUrl: null,
      coverMode: "iframe",
      sortOrder: 1,
      isVisible: true,
      allowInteraction: false,
    });
    await insertSite(env, {
      name: "Hidden",
      slug: "hidden",
      url: "https://hidden.example.com",
      monitorKey: null,
      category: "web",
      description: "",
      summary: "Hidden summary",
      tags: ["Secret"],
      techStack: ["D1"],
      isFeatured: false,
      repoUrl: null,
      fallbackUrl: null,
      coverMode: "iframe",
      sortOrder: 2,
      isVisible: false,
      allowInteraction: false,
    });

    const publicResponse = await handleGetSites(
      new Request("https://worker.test/sites"),
      env
    );
    const publicBody = await publicResponse.json();
    assert.deepEqual(
      publicBody.sites.map((site) => site.slug),
      ["visible"]
    );
    assert.deepEqual(publicBody.sites[0].tags, ["Live", "Portfolio"]);
    assert.deepEqual(publicBody.sites[0].techStack, ["D1"]);
    assert.equal(publicBody.sites[0].isFeatured, true);
    assert.equal(
      publicBody.sites[0].repoUrl,
      "https://github.com/example/visible"
    );

    const unauthenticatedHiddenResponse = await handleGetSites(
      new Request("https://worker.test/sites?includeHidden=1"),
      env
    );
    const unauthenticatedHiddenBody =
      await unauthenticatedHiddenResponse.json();
    assert.deepEqual(
      unauthenticatedHiddenBody.sites.map((site) => site.slug),
      ["visible"]
    );
    db.close();
  });

  it("maps Worker and network failures to friendly Chinese messages", () => {
    assert.equal(
      getFriendlyApiErrorMessage(new Error("Unauthorized"), "保存失败。"),
      "登录已过期，请重新登录。"
    );
    assert.equal(
      getFriendlyApiErrorMessage(new Error("Invalid password"), "登录失败。"),
      "密码不正确，请重新输入。"
    );
    assert.equal(
      getFriendlyApiErrorMessage(
        new Error("Site URL must be a valid absolute URL"),
        "保存失败。"
      ),
      "请输入有效的 https:// 网站地址。"
    );
    assert.equal(
      getFriendlyApiErrorMessage(
        new TypeError("Failed to fetch"),
        "保存失败。"
      ),
      "网络暂时不可用，请稍后再试。"
    );
  });

  it("keeps sensitive Worker secrets out of frontend admin files", () => {
    const frontendFiles = [
      "app/_components/admin-dashboard.tsx",
      "app/_components/admin-login-form.tsx",
      "app/_components/admin-site-form.tsx",
      "app/_components/admin-site-table.tsx",
      "app/_lib/api-client.ts",
    ];

    for (const file of frontendFiles) {
      const source = readFileSync(join(root, file), "utf8");
      assert.equal(source.includes("ADMIN_PASSWORD"), false, file);
      assert.equal(source.includes("SESSION_SECRET"), false, file);
    }
  });

  it("keeps admin CRUD and auth calls routed through the shared API client", () => {
    const dashboard = readFileSync(
      join(root, "app/_components/admin-dashboard.tsx"),
      "utf8"
    );
    const apiClient = readFileSync(join(root, "app/_lib/api-client.ts"), "utf8");
    const componentFiles = [
      "app/_components/admin-dashboard.tsx",
      "app/_components/admin-login-form.tsx",
      "app/_components/admin-site-form.tsx",
      "app/_components/admin-site-table.tsx",
    ];

    for (const fn of [
      "getAuthState",
      "getSites",
      "login",
      "logout",
      "createSite",
      "updateSite",
      "deleteSite",
    ]) {
      assert.match(dashboard, new RegExp(`\\b${fn}\\b`));
    }

    for (const file of componentFiles) {
      const source = readFileSync(join(root, file), "utf8");
      assert.equal(source.includes("fetch("), false, file);
    }

    for (const endpoint of [
      '"/auth/me"',
      '"/auth/login"',
      '"/auth/logout"',
      '"/sites"',
      '`/sites/${id}`',
    ]) {
      assert.equal(apiClient.includes(endpoint), true, endpoint);
    }
  });

  it("uses a single admin editor panel instead of parallel create and edit forms", () => {
    const dashboard = readFileSync(
      join(root, "app/_components/admin-dashboard.tsx"),
      "utf8"
    );
    const formUsages = dashboard.match(/<AdminSiteForm\b/g) ?? [];

    assert.equal(formUsages.length, 1);
    assert.match(dashboard, /mode=\{editingSite \? "edit" : "create"\}/);
  });

  it("keeps admin table actions explicit and confirms before delete", () => {
    const table = readFileSync(
      join(root, "app/_components/admin-site-table.tsx"),
      "utf8"
    );

    assert.match(table, /href=\{site\.url\}/);
    assert.match(table, /target="_blank"/);
    assert.match(table, /confirmingDeleteId/);
    assert.match(table, /确认删除/);
    assert.match(table, /取消删除/);
  });

  it("offers one command to run the frontend and Worker locally", () => {
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    );
    const script = readFileSync(join(root, "scripts/dev-all.mjs"), "utf8");

    assert.equal(packageJson.scripts["dev:all"], "node scripts/dev-all.mjs");
    assert.match(script, /NEXT_PUBLIC_API_BASE_URL/);
    assert.match(script, /http:\/\/localhost:8787/);
    assert.match(script, /cwd: workerDir/);
    assert.match(script, /cwd: root/);
    assert.match(script, /cmd\.exe/);
    assert.match(script, /\/d/);
    assert.match(script, /\/s/);
    assert.match(script, /\/c/);
    assert.doesNotMatch(script, /npm\.cmd/);
  });
});

function makeSite({ id, category, isOnline, isFeatured = false }) {
  return {
    id,
    name: `Site ${id}`,
    slug: `site-${id}`,
    url: `https://site-${id}.example.com`,
    monitorKey: null,
    category,
    description: "",
    summary: "",
    tags: [],
    techStack: [],
    isFeatured,
    repoUrl: null,
    fallbackUrl: null,
    coverMode: "iframe",
    sortOrder: id,
    isVisible: true,
    allowInteraction: false,
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    status: {
      isOnline,
      latency: null,
      hasMonitorKey: false,
      monitorDataLoaded: true,
      monitorMatched: false,
    },
  };
}

function createSqliteD1Env(db) {
  return {
    ADMIN_PASSWORD: "test-password",
    SESSION_SECRET: "test-secret",
    DB: {
      prepare(sql) {
        return new SqliteD1Statement(db, sql);
      },
    },
  };
}

function createPublicGoodEnv(overrides = {}) {
  return {
    ADMIN_PASSWORD: "test-password",
    SESSION_SECRET: "test-secret",
    DB: null,
    ...overrides,
  };
}

function makePublicGoodApiResponse(overrides = {}) {
  const data = {
    id: "448061",
    name: "李瑾怡",
    sex: "女",
    birth_time: "2004年02月17日",
    lost_time: "2020年01月01日",
    child_pic: "https://assets.example.com/child.jpg",
    lost_place: "湖北省荆州市监利县容城镇",
    url: "https://example.com/detail",
    child_feature: "圆脸，短发，走失时穿黄色外套。",
    ...overrides,
  };

  return {
    success: true,
    data,
    contacts: {
      consult_mail: "baobeihuijia@yeah.net",
      tel: "0435-3338090",
    },
    name: "姬长信API",
    api: "https://api.isoyu.com/",
  };
}

class SqliteD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async run() {
    this.db.prepare(this.sql).run(...this.params);
    return { success: true };
  }

  async all() {
    return {
      results: this.db
        .prepare(this.sql)
        .all(...this.params)
        .map((row) => Object.fromEntries(Object.entries(row))),
    };
  }

  async first() {
    const row = this.db.prepare(this.sql).get(...this.params);
    return row ? Object.fromEntries(Object.entries(row)) : null;
  }
}
