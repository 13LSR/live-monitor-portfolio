import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getFriendlyApiErrorMessage } from "../app/_lib/api-errors.ts";
import {
  buildSitePayloadForSubmit,
  createSlugFromSiteInput,
  getNextSlugValue,
  validateAdminSitePayload,
} from "../app/_lib/site-form-utils.ts";
import {
  createCollectionSummary,
  filterSitesByCategory,
} from "../app/_lib/portfolio-summary.ts";
import {
  getSiteMutationErrorMessage,
  getSitePayloadValidationError,
} from "../worker/src/site-validation.ts";

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
    assert.match(bentoGrid, /const \[featuredSite, \.\.\.otherSites\] = sites/);
    assert.match(bentoGrid, /<LiveProjectCard site=\{featuredSite\} featured/);
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
    assert.match(card, /window\.open\(site\.url/);
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
    assert.match(bentoGrid, /<LiveProjectCard/);
  });

  it("keeps monitor fetching bounded so public sites are not hidden by a slow status source", () => {
    const uptimeflare = readFileSync(
      join(root, "app/_lib/uptimeflare.ts"),
      "utf8"
    );

    assert.match(uptimeflare, /MONITOR_FETCH_TIMEOUT_MS = 4_000/);
    assert.match(uptimeflare, /new AbortController\(\)/);
    assert.match(uptimeflare, /signal: controller\.signal/);
    assert.match(uptimeflare, /finally \{\s*clearTimeout\(timeoutId\);\s*}/s);
    assert.match(uptimeflare, /clearTimeout\(timeoutId\)/);
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

  it("keeps Phase 4 data model work out of the Phase 1-3 delivery", () => {
    const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
    const migrations = readFileSync(
      join(root, "worker/migrations/0001_init.sql"),
      "utf8"
    );
    const sharedContracts = readFileSync(
      join(root, "shared/contracts.ts"),
      "utf8"
    );
    const migrationFiles = readdirSync(join(root, "worker/migrations"));

    assert.match(nextConfig, /output:\s*"export"/);
    assert.doesNotMatch(migrations, /is_featured|tech_stack|repo_url|fallback_url/);
    assert.doesNotMatch(sharedContracts, /isFeatured|techStack|repoUrl|fallbackUrl/);
    assert.deepEqual(migrationFiles, ["0001_init.sql"]);
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
    });
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
});

function makeSite({ id, category, isOnline }) {
  return {
    id,
    name: `Site ${id}`,
    slug: `site-${id}`,
    url: `https://site-${id}.example.com`,
    monitorKey: null,
    category,
    description: "",
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
