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

  assertIncludes(home, "小茄的网站小岛", "frontend home brand");
  assertIncludes(admin, "__next", "frontend admin route renders Next shell");
}

async function verifyWorkerPublicApi() {
  const auth = await getJson(`${apiUrl}/auth/me`, "worker auth state");
  const publicSites = await getJson(`${apiUrl}/sites`, "worker public sites");

  assertEqual(auth.authenticated, false, "worker unauthenticated state");
  assertArray(publicSites.sites, "worker public sites list");
}

async function verifyAuthenticatedCrud() {
  const loginResponse = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ password: adminPassword }),
  });
  assertStatus(loginResponse, 200, "worker login");
  const cookie = loginResponse.headers.get("set-cookie");

  if (!cookie) {
    fail("worker login cookie", "missing Set-Cookie header");
    return;
  }

  const slug = `codex-local-${Date.now()}`;
  const createPayload = {
    name: "Codex Local Verify",
    slug,
    url: "https://example.com",
    monitorKey: null,
    category: "tool",
    description: "Temporary local verification record.",
    coverMode: "iframe",
    sortOrder: 9999,
    isVisible: false,
    allowInteraction: false,
  };

  const createResponse = await fetch(`${apiUrl}/sites`, {
    method: "POST",
    headers: jsonHeaders(cookie),
    body: JSON.stringify(createPayload),
  });
  assertStatus(createResponse, 200, "worker create site");

  const hiddenSites = await getJson(
    `${apiUrl}/sites?includeHidden=1`,
    "worker include hidden sites",
    cookie
  );
  const created = hiddenSites.sites.find((site) => site.slug === slug);

  if (!created) {
    fail("worker list refresh", "created site not returned from includeHidden list");
    return;
  }

  const updateResponse = await fetch(`${apiUrl}/sites/${created.id}`, {
    method: "PUT",
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      ...createPayload,
      name: "Codex Local Verify Updated",
    }),
  });
  assertStatus(updateResponse, 200, "worker update site");

  const deleteResponse = await fetch(`${apiUrl}/sites/${created.id}`, {
    method: "DELETE",
    headers: jsonHeaders(cookie),
  });
  assertStatus(deleteResponse, 200, "worker delete site");

  const logoutResponse = await fetch(`${apiUrl}/auth/logout`, {
    method: "POST",
    headers: jsonHeaders(cookie),
  });
  assertStatus(logoutResponse, 200, "worker logout");
}

async function getText(url, name) {
  try {
    const response = await fetch(url);
    assertStatus(response, 200, name);
    return response.text();
  } catch (error) {
    fail(name, explainFetchError(error, url));
    return "";
  }
}

async function getJson(url, name, cookie) {
  try {
    const response = await fetch(url, {
      headers: cookie ? { Cookie: cookie } : undefined,
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
    ...(cookie ? { Cookie: cookie } : {}),
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
