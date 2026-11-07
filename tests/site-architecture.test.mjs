import { it } from "node:test";
import assert from "node:assert/strict";
import { emptyArchitecture, getArchitectureError, normalizeArchitecture, parseArchitecture, layoutArchitecture } from "../shared/site-architecture.ts";
import { verifySavedSite } from "../app/_lib/site-save-verification.ts";
import { portfolioContent } from "../shared/portfolio-content.ts";
import worker from "../worker/src/index.ts";
import { createSessionCookie } from "../worker/src/cookies.ts";
import { createTestDatabase } from "./helpers/d1.mjs";

const architecture = {
  ...emptyArchitecture(), overview: "  通过边缘 API 保存内容  ", frontend: "界面与交互", backend: "鉴权和内容 API",
  nodes: [
    { id: "web", kind: "frontend", label: "网站", technology: "Next.js, React", description: "静态前端" },
    { id: "api", kind: "backend", label: "API", technology: "Cloudflare", description: "Worker" },
    { id: "db", kind: "data", label: "数据库", technology: "D1", description: "保存站点" },
  ],
  edges: [{ from: "web", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }],
};

it("validates bounded architecture content and rejects dangling, duplicate and self connections", () => {
  assert.equal(getArchitectureError(architecture), null);
  for (const value of [false, [], {}, { ...architecture, overview: 12 },
    { ...architecture, nodes: [...architecture.nodes, architecture.nodes[0]] },
    { ...architecture, nodes: [{ ...architecture.nodes[0], kind: { toString: {} } }] },
    { ...architecture, edges: [{ from: "web", to: "missing", label: "" }] },
    { ...architecture, edges: [{ from: "web", to: "web", label: "" }] },
    { ...architecture, edges: [...architecture.edges, architecture.edges[0]] },
    { ...architecture, overview: "x".repeat(1601) },
    { ...architecture, nodes: Array(13).fill(architecture.nodes[0]) },
  ]) assert.ok(getArchitectureError(value));
  assert.equal(normalizeArchitecture(emptyArchitecture()), null);
  assert.equal(parseArchitecture("broken json"), null);
  assert.equal(parseArchitecture('{"nodes":[]}'), null);
});

it("keeps graph components within their diagram and supports feedback cycles without recursion", () => {
  const nodes = [...architecture.nodes, { ...architecture.nodes[0], id: "web2" }];
  const layout = layoutArchitecture(nodes);
  assert.equal(layout.nodes.length, 4);
  const positions = new Set();
  for (const node of layout.nodes) {
    assert.ok(node.x >= 0 && node.x + 172 <= layout.width);
    assert.ok(node.y >= 0 && node.y + 92 <= layout.height);
    positions.add(`${node.x}:${node.y}`);
  }
  assert.equal(positions.size, 4);
  assert.equal(getArchitectureError({ ...architecture, edges: [...architecture.edges, { from: "db", to: "api", label: "返回" }] }), null);
});

it("round-trips architecture through D1, preserves it for legacy updates, and supports explicit clearing", async (t) => {
  const { binding, db } = createTestDatabase(t);
  const origin = "https://proj.331106.xyz", secret = "architecture-test-secret";
  const env = { DB: binding, ADMIN_PASSWORD: "test-password", SESSION_SECRET: secret, ALLOWED_ORIGINS: origin };
  const cookie = `admin_session=${await createSessionCookie(secret)}`;
  const mutate = (path, method, payload) => worker.fetch(new Request(`https://api.example.com${path}`, {
    method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }), env);
  const read = async () => (await (await worker.fetch(new Request("https://api.example.com/sites"), env)).json()).sites;
  const payload = { ...portfolioContent[0], isVisible: true, architecture };
  assert.equal((await mutate("/sites", "POST", payload)).status, 200);
  let saved = (await read())[0];
  assert.deepEqual(saved.architecture, normalizeArchitecture(architecture));
  assert.equal(verifySavedSite([saved], payload, saved.id), saved);
  assert.throws(() => verifySavedSite([{ ...saved, architecture: null }], payload, saved.id), /不一致/);
  const { architecture: ignored, ...legacyPayload } = payload;
  assert.ok(ignored);
  assert.equal((await mutate(`/sites/${saved.id}`, "PUT", { ...legacyPayload, name: "Legacy edit" })).status, 200);
  saved = (await read())[0];
  assert.deepEqual(saved.architecture, normalizeArchitecture(architecture));
  assert.equal((await mutate(`/sites/${saved.id}`, "PUT", { ...payload, architecture: { ...architecture, edges: [{ from: "web", to: "nope", label: "" }] } })).status, 400);
  assert.deepEqual((await read())[0].architecture, normalizeArchitecture(architecture));
  assert.equal((await mutate(`/sites/${saved.id}`, "PUT", { ...payload, architecture: null })).status, 200);
  assert.equal((await read())[0].architecture, null);
  assert.equal(db.prepare("SELECT architecture FROM sites WHERE id = ?").get(saved.id).architecture, null);
});
