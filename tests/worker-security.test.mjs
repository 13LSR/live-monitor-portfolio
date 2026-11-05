import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import worker from "../worker/src/index.ts";
import { createSessionCookie, verifySessionCookie, SESSION_MAX_AGE_SECONDS } from "../worker/src/cookies.ts";
import { reserveLoginAttempt, LOGIN_WINDOW_SECONDS } from "../worker/src/login-limiter.ts";
import { createTestDatabase } from "./helpers/d1.mjs";

const origin = "https://portfolio.example.com";
const api = "https://api.example.com";
const secret = "security-test-session-secret";

function environment(t) {
  const { db, binding } = createTestDatabase(t);
  return { db, env: { ADMIN_PASSWORD: "test-admin-password", SESSION_SECRET: secret, ALLOWED_ORIGINS: origin, DB: binding } };
}

function request(path, options = {}) {
  const { method = "GET", headers, body } = options;
  return new Request(api + path, {
    method,
    headers: { Origin: origin, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function signedCookie(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

describe("Worker authentication boundaries", () => {
  it("allows the configured frontend and denies untrusted, null and absent write origins", async (t) => {
    const { env, db } = environment(t);
    const cookie = await createSessionCookie(secret);
    for (const untrusted of ["https://attacker.example", origin + ".attacker.example", "null", "http://localhost:3000"]) {
      for (const [method, path] of [["POST", "/auth/login"], ["POST", "/auth/logout"], ["POST", "/sites"], ["POST", "/sites/seed"], ["PUT", "/sites/1"], ["DELETE", "/sites/1"]]) {
        const response = await worker.fetch(request(path, { method, headers: { Origin: untrusted, Cookie: `admin_session=${cookie}` } }), env);
        assert.equal(response.status, 403, `${method} ${path} ${untrusted}`);
        assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
      }
    }
    assert.equal((await worker.fetch(new Request(api + "/auth/logout", { method: "POST" }), env)).status, 403);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_login_attempts").get().n, 0);
    const response = await worker.fetch(request("/auth/me"), env);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
    assert.match(response.headers.get("Vary"), /Origin/);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  });

  it("restricts preflight methods and headers while allowing local development", async (t) => {
    const { env } = environment(t);
    const preflight = (headers) => worker.fetch(request("/sites", { method: "OPTIONS", headers }), env);
    assert.equal((await preflight({ "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" })).status, 204);
    assert.equal((await preflight({ "Access-Control-Request-Method": "PATCH" })).status, 403);
    assert.equal((await preflight({ "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-unexpected" })).status, 403);
    const local = await worker.fetch(new Request("http://localhost:8787/auth/me", { headers: { Origin: "http://localhost:3000" } }), env);
    assert.equal(local.status, 200);
    const publicList = await worker.fetch(new Request(api + "/sites"), env);
    assert.equal(publicList.status, 200);
    assert.equal(publicList.headers.get("Access-Control-Allow-Origin"), null);
  });

  it("rejects invalid bodies and fails closed when auth configuration or rate storage is absent", async (t) => {
    const { env } = environment(t);
    for (const body of [null, [], { password: 42 }, { password: "" }]) {
      assert.equal((await worker.fetch(request("/auth/login", { method: "POST", body }), env)).status, 400);
    }
    const malformed = new Request(api + "/auth/login", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{" });
    assert.equal((await worker.fetch(malformed, env)).status, 400);
    assert.equal((await worker.fetch(request("/auth/login", { method: "POST", body: {}, headers: { "Content-Type": "text/plain" } }), env)).status, 415);
    assert.equal((await worker.fetch(request("/auth/login", { method: "POST", body: { password: "x".repeat(5000) } }), env)).status, 413);
    const login = () => request("/auth/login", { method: "POST", body: { password: env.ADMIN_PASSWORD } });
    assert.equal((await worker.fetch(login(), { ...env, SESSION_SECRET: "" })).status, 503);
    assert.equal((await worker.fetch(login(), { ...env, DB: null })).status, 503);
  });

  it("issues an HttpOnly cookie, reads private data and clears the browser cookie on logout", async (t) => {
    const { env, db } = environment(t);
    const response = await worker.fetch(request("/auth/login", { method: "POST", body: { password: env.ADMIN_PASSWORD } }), env);
    assert.equal(response.status, 200);
    const cookie = response.headers.get("Set-Cookie");
    assert.match(cookie, /HttpOnly; SameSite=None; Secure; Max-Age=604800/);
    const headers = { Cookie: cookie.split(";")[0] };
    assert.deepEqual(await (await worker.fetch(request("/auth/me", { headers }), env)).json(), { authenticated: true });
    const privateList = await worker.fetch(request("/sites?includeHidden=1", { headers }), env);
    assert.equal(privateList.status, 200);
    assert.equal(privateList.headers.get("Cache-Control"), "no-store");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_login_attempts").get().n, 0);
    const logout = await worker.fetch(request("/auth/logout", { method: "POST", headers }), env);
    assert.match(logout.headers.get("Set-Cookie"), /Max-Age=0/);
  });

  it("limits concurrent password failures to five and returns the remaining lock time", async (t) => {
    const { env, db } = environment(t);
    const attempts = await Promise.all(Array.from({ length: 8 }, () => worker.fetch(request("/auth/login", { method: "POST", body: { password: "wrong" }, headers: { "CF-Connecting-IP": "192.0.2.1" } }), env)));
    assert.equal(attempts.filter((response) => response.status === 401).length, 5);
    assert.equal(attempts.filter((response) => response.status === 429).length, 3);
    const denied = attempts.find((response) => response.status === 429);
    assert.ok(Number(denied.headers.get("Retry-After")) > 0);
    assert.ok(Number(denied.headers.get("Retry-After")) <= LOGIN_WINDOW_SECONDS);
    const saved = db.prepare("SELECT * FROM admin_login_attempts").get();
    assert.equal(saved.client_key.includes("192.0.2.1"), false);
    const separate = await worker.fetch(request("/auth/login", { method: "POST", body: { password: env.ADMIN_PASSWORD }, headers: { "CF-Connecting-IP": "192.0.2.2" } }), env);
    assert.equal(separate.status, 200);
  });

  it("unlocks expired buckets and cannot evade the local limit by spoofing IP headers", async (t) => {
    const { env } = environment(t);
    const now = 1_800_000_000_000;
    const local = (ip) => new Request("http://localhost:8787/auth/login", { headers: { "CF-Connecting-IP": ip, "X-Forwarded-For": ip } });
    for (let index = 0; index < 5; index += 1) assert.equal((await reserveLoginAttempt(local(`192.0.2.${index}`), env, now)).allowed, true);
    assert.equal((await reserveLoginAttempt(local("192.0.2.100"), env, now + 1000)).allowed, false);
    assert.equal((await reserveLoginAttempt(local("192.0.2.100"), env, now + LOGIN_WINDOW_SECONDS * 1000)).allowed, true);
  });

  it("rejects expired, future, malformed and tampered sessions at the server", async () => {
    const now = Date.now();
    const valid = await createSessionCookie(secret);
    assert.equal(await verifySessionCookie(valid, secret), true);
    for (const value of [
      valid + ".extra", "bad.cookie", "x".repeat(2050),
      signedCookie({ authenticated: true, issuedAt: new Date(now - SESSION_MAX_AGE_SECONDS * 1000).toISOString() }),
      signedCookie({ authenticated: true, issuedAt: new Date(now + 60000).toISOString() }),
      signedCookie({ authenticated: true, issuedAt: "not-a-date" }),
      signedCookie({ authenticated: false, issuedAt: new Date(now).toISOString() }),
      valid.replace(/.$/, "!"),
    ]) assert.equal(await verifySessionCookie(value, secret), false);
    assert.equal(await verifySessionCookie(valid, "other-secret"), false);
    assert.equal(await verifySessionCookie(valid, ""), false);
  });

  it("returns 400 for malformed site fields and 401 for missing or expired sessions", async (t) => {
    const { env } = environment(t);
    const body = { name: 42 };
    assert.equal((await worker.fetch(request("/sites", { method: "POST", body }), env)).status, 401);
    const valid = await createSessionCookie(secret);
    assert.equal((await worker.fetch(request("/sites", { method: "POST", body, headers: { Cookie: `admin_session=${valid}` } }), env)).status, 400);
    const expired = signedCookie({ authenticated: true, issuedAt: "2000-01-01T00:00:00.000Z" });
    assert.equal((await worker.fetch(request("/sites/1", { method: "DELETE", headers: { Cookie: `admin_session=${expired}` } }), env)).status, 401);
  });
});
