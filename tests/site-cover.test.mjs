import { it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { DEFAULT_COVER_URL, isCoverUrl, resolveCoverUrl } from "../shared/site-cover.ts";
import { buildSitePayloadForSubmit, validateAdminSitePayload } from "../app/_lib/site-form-utils.ts";
import { getSitePayloadValidationError } from "../worker/src/site-validation.ts";
import { createSessionCookie } from "../worker/src/cookies.ts";
import worker from "../worker/src/index.ts";
import { createTestDatabase } from "./helpers/d1.mjs";
import { flightProgress } from "../app/_lib/scene/camera-flight.ts";

const payload = {
  name: "Cover test", slug: "cover-test", url: "https://example.com", monitorKey: null,
  category: "web", description: "", summary: "", tags: [], techStack: [], isFeatured: false,
  repoUrl: null, fallbackUrl: null, coverUrl: null, coverMode: "iframe", sortOrder: 0,
  isVisible: true, allowInteraction: false,
};

it("accepts direct image-host links and safely falls back for absent or unsafe covers", () => {
  for (const value of [undefined, null, "", " ", "javascript:alert(1)", "data:image/svg+xml,test", "//example.com/a.jpg", "https://user:pass@example.com/a.jpg", "not-a-url"]) {
    assert.equal(resolveCoverUrl(value), DEFAULT_COVER_URL);
  }
  for (const value of ["https://example.com/a.webp?width=800", "http://example.com/a.png", DEFAULT_COVER_URL]) {
    assert.equal(isCoverUrl(value), true);
    assert.equal(resolveCoverUrl(` ${value} `), value);
  }
  assert.equal(isCoverUrl("https://example.com/" + "a".repeat(2048)), false);
});

it("validates cover inputs at both admin and Worker boundaries with backward compatibility", () => {
  for (const value of [null, undefined, "", "   ", DEFAULT_COVER_URL]) {
    assert.equal(getSitePayloadValidationError({ ...payload, coverUrl: value }), null);
    assert.equal(validateAdminSitePayload({ ...payload, coverUrl: value }), null);
  }
  for (const value of [12, {}, [], true, "file:///tmp/image.png", "javascript:alert(1)", "https://user:pass@example.com/a.jpg"]) {
    assert.equal(getSitePayloadValidationError({ ...payload, coverUrl: value }), "Cover URL must be a valid http(s) image URL");
  }
  assert.ok(validateAdminSitePayload({ ...payload, coverUrl: "data:image/png,test" }));
  assert.equal(buildSitePayloadForSubmit({ ...payload, coverUrl: "   " }).coverUrl, null);
  assert.equal(buildSitePayloadForSubmit({ ...payload, coverUrl: ` ${DEFAULT_COVER_URL} ` }).coverUrl, DEFAULT_COVER_URL);
});

it("adds the cover column without changing existing website data", (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  for (const name of ["0001_init.sql", "0002_portfolio_fields.sql"]) db.exec(readFileSync(`worker/migrations/${name}`, "utf8"));
  db.exec("INSERT INTO sites (name,slug,url,category,created_at,updated_at) VALUES ('Existing','existing','https://example.com','web','old','old')");
  const before = { ...db.prepare("SELECT * FROM sites").get() };
  db.exec(readFileSync("worker/migrations/0004_site_cover.sql", "utf8"));
  assert.deepEqual({ ...db.prepare("SELECT * FROM sites").get() }, { ...before, cover_url: null });
});

it("persists, updates and clears covers through authenticated APIs and public reads", async (t) => {
  const { binding } = createTestDatabase(t);
  const origin = "https://portfolio.example.com";
  const secret = "cover-test-secret";
  const env = { DB: binding, ADMIN_PASSWORD: "test-password", SESSION_SECRET: secret, ALLOWED_ORIGINS: origin };
  const cookie = `admin_session=${await createSessionCookie(secret)}`;
  const mutate = (path, method, body) => worker.fetch(new Request(`https://api.example.com${path}`, {
    method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), env);
  const list = async () => (await (await worker.fetch(new Request("https://api.example.com/sites"), env)).json()).sites;
  assert.equal((await mutate("/sites", "POST", { ...payload, coverUrl: DEFAULT_COVER_URL })).status, 200);
  let sites = await list();
  assert.equal(sites[0].coverUrl, DEFAULT_COVER_URL);
  const id = sites[0].id;
  const coverUrl = "https://images.example.com/new.webp";
  assert.equal((await mutate(`/sites/${id}`, "PUT", { ...payload, coverUrl })).status, 200);
  assert.equal((await list())[0].coverUrl, coverUrl);
  assert.equal((await mutate(`/sites/${id}`, "PUT", { ...payload, coverUrl: "javascript:alert(1)" })).status, 400);
  assert.equal((await list())[0].coverUrl, coverUrl);
  assert.equal((await mutate(`/sites/${id}`, "PUT", { ...payload, coverUrl: " " })).status, 200);
  sites = await list();
  assert.equal(sites[0].coverUrl, null);
  assert.equal(resolveCoverUrl(sites[0].coverUrl), DEFAULT_COVER_URL);
});

it("camera flights stay bounded, progress forward and settle gently at both ends", () => {
  assert.equal(flightProgress(-1), 0);
  assert.equal(flightProgress(0), 0);
  assert.equal(flightProgress(1.65), 1);
  assert.equal(flightProgress(5), 1);
  let previous = 0;
  for (let i = 1; i <= 100; i++) {
    const progress = flightProgress(i / 100 * 1.65);
    assert.ok(progress >= previous && progress <= 1);
    previous = progress;
  }
  assert.ok(flightProgress(0.01) < 0.00001);
  assert.ok(1 - flightProgress(1.64) < 0.00001);
});
