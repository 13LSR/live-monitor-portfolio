#!/usr/bin/env node

const frontendUrl = trimTrailingSlash(
  process.env.FRONTEND_URL || "http://localhost:3000"
);
const apiUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787"
);
const adminPassword = process.env.ADMIN_PASSWORD || "";

if (process.argv.includes("--help")) {
  console.log(`Usage:
  npm run verify:local
  ADMIN_PASSWORD=<password> npm run verify:local

Environment:
  FRONTEND_URL defaults to http://localhost:3000
  NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8787
  ADMIN_PASSWORD enables authenticated CRUD verification

This script never starts services. Start the frontend and Worker yourself first.`);
  process.exit(0);
}

const checks = [];

try {
  await verifyFrontend();
  await verifyWorkerPublicApi();

  if (adminPassword) {
    await verifyAuthenticatedCrud();
  } else {
    checks.push({
      name: "authenticated CRUD",
      status: "skipped",
      detail: "set ADMIN_PASSWORD to verify login/create/update/delete/logout",
    });
  }

  printResults();
  const failed = checks.filter((check) => check.status === "failed");
  process.exit(failed.length > 0 ? 1 : 0);
} catch (error) {
  checks.push({
    name: "unexpected verifier error",
    status: "failed",
    detail: error instanceof Error ? error.message : String(error),
  });
  printResults();
  process.exit(1);
}

async function verifyFrontend() {
  const home = await getText(`${frontendUrl}/`, "frontend home");
  const admin = await getText(`${frontendUrl}/admin`, "frontend admin");

  assertIncludes(home, "小茄的网站作品集", "frontend home brand");
  assertIncludes(admin, "__next", "frontend admin route renders Next shell");
}

async function verifyWorkerPublicApi() {
  const auth = await getJson(`${apiUrl}/auth/me`, "worker auth state");
  const publicSites = await getJson(`${apiUrl}/sites`, "worker public sites");

  assertEqual(auth.authenticated, false, "worker unauthenticated state");
  assertArray(publicSites.sites, "worker public sites list");
}

async function verifyAuthenticatedCrud() {
  for (const value of [frontendUrl, apiUrl]) {
    const url = new URL(value);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password) {
      throw new Error("Authenticated verification is restricted to local services.");
    }
  }
  const loginResponse = await fetchWithTimeout(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ password: adminPassword }),
  });
  assertStatus(loginResponse, 200, "worker login");
  if (!loginResponse.ok) return;
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) {
    fail("worker login cookie", "missing Set-Cookie header");
    return;
  }

  const slug = `codex-local-${Date.now()}`;
  const createPayload = {
    name: "Codex Local Verify", slug, url: "https://example.com",
    monitorKey: null, category: "tool", description: "Temporary local verification record.",
    summary: "Temporary verification", tags: ["local-check"], techStack: [],
    isFeatured: false, repoUrl: null, fallbackUrl: null, coverUrl: "https://eo-vpic.byz.qzz.io/",
    coverMode: "iframe", sortOrder: 9999, isVisible: false, allowInteraction: false,
  };
  let created = false;
  let createdId;
  try {
    const response = await fetchWithTimeout(`${apiUrl}/sites`, {
      method: "POST", headers: jsonHeaders(cookie), body: JSON.stringify(createPayload),
    });
    assertStatus(response, 200, "worker create site");
    if (!response.ok) return;
    created = true;
    const hidden = await getJson(`${apiUrl}/sites?includeHidden=1`, "worker include hidden sites", cookie);
    createdId = hidden.sites?.find((site) => site.slug === slug)?.id;
    if (!createdId) {
      fail("worker list refresh", "created site missing from authenticated list");
      return;
    }
    assertEqual(hidden.sites.find((site) => site.id === createdId)?.coverUrl, createPayload.coverUrl, "worker persisted cover URL");
    const publicList = await getJson(`${apiUrl}/sites`, "worker hidden record isolation");
    assertEqual(publicList.sites?.some((site) => site.slug === slug), false, "hidden site is not public");
    const updated = await fetchWithTimeout(`${apiUrl}/sites/${createdId}`, {
      method: "PUT", headers: jsonHeaders(cookie),
      body: JSON.stringify({ ...createPayload, name: "Codex Local Verify Updated", coverUrl: "" }),
    });
    assertStatus(updated, 200, "worker update site");
    const refreshed = await getJson(`${apiUrl}/sites?includeHidden=1`, "worker updated list", cookie);
    assertEqual(refreshed.sites?.find((site) => site.id === createdId)?.name, "Codex Local Verify Updated", "worker persisted update");
    assertEqual(refreshed.sites?.find((site) => site.id === createdId)?.coverUrl, null, "worker cleared cover for default fallback");
  } finally {
    try {
      if (created) {
        if (!createdId) {
          const list = await getJson(`${apiUrl}/sites?includeHidden=1`, "worker cleanup lookup", cookie);
          createdId = list.sites?.find((site) => site.slug === slug)?.id;
        }
        if (createdId) {
          const deleted = await fetchWithTimeout(`${apiUrl}/sites/${createdId}`, {
            method: "DELETE", headers: jsonHeaders(cookie),
          });
          assertStatus(deleted, 200, "worker delete temporary site");
          const remaining = await getJson(`${apiUrl}/sites?includeHidden=1`, "worker cleanup confirmation", cookie);
          assertEqual(remaining.sites?.some((site) => site.slug === slug), false, "temporary site removed");
        } else {
          fail("temporary site cleanup", `could not find ${slug}`);
        }
      }
    } finally {
      const loggedOut = await fetchWithTimeout(`${apiUrl}/auth/logout`, {
        method: "POST", headers: jsonHeaders(cookie),
      });
      assertStatus(loggedOut, 200, "worker logout");
    }
  }
}

async function getText(url, name) {
  try {
    const response = await fetchWithTimeout(url);
    assertStatus(response, 200, name);
    return response.text();
  } catch (error) {
    fail(name, explainFetchError(error, url));
    return "";
  }
}

async function getJson(url, name, cookie) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: cookie ? { Cookie: cookie, Origin: new URL(frontendUrl).origin } : undefined,
    });
    assertStatus(response, 200, name);
    return response.json();
  } catch (error) {
    fail(name, explainFetchError(error, url));
    return {};
  }
}

function assertStatus(response, expected, name) {
  if (response.status === expected) {
    pass(name, `HTTP ${response.status}`);
    return;
  }

  fail(name, `expected HTTP ${expected}, got HTTP ${response.status}`);
}

function assertIncludes(value, expected, name) {
  if (value.includes(expected)) {
    pass(name, `found ${expected}`);
    return;
  }

  fail(name, `missing ${expected}`);
}

function assertEqual(actual, expected, name) {
  if (actual === expected) {
    pass(name, `${actual}`);
    return;
  }

  fail(name, `expected ${expected}, got ${actual}`);
}

function assertArray(value, name) {
  if (Array.isArray(value)) {
    pass(name, `${value.length} sites`);
    return;
  }

  fail(name, "expected sites array");
}

function pass(name, detail) {
  checks.push({ name, status: "passed", detail });
}

function fail(name, detail) {
  checks.push({ name, status: "failed", detail });
}

function printResults() {
  for (const check of checks) {
    const marker =
      check.status === "passed" ? "PASS" : check.status === "skipped" ? "SKIP" : "FAIL";
    console.log(`${marker} ${check.name}: ${check.detail}`);
  }
}

function jsonHeaders(cookie) {
  return {
    "Content-Type": "application/json",
    Origin: new URL(frontendUrl).origin,
    ...(cookie ? { Cookie: cookie.split(";")[0] } : {}),
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function explainFetchError(error, url) {
  if (error instanceof Error) {
    return `${error.message}; ensure service is running at ${url}`;
  }

  return `unknown error; ensure service is running at ${url}`;
}

function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(15_000), redirect: "error" });
}
