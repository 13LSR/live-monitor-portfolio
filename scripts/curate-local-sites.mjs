import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { portfolioContent } from "../shared/portfolio-content.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const api = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787");
const frontend = new URL(process.env.FRONTEND_URL || "http://localhost:3000");
for (const url of [api, frontend]) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password) {
    throw new Error("Content updates are restricted to local development services.");
  }
}
const vars = parseEnv(await readFile(join(root, "worker/.dev.vars"), "utf8"));
let cookie = "";

async function request(path, method = "GET", body) {
  const response = await fetch(new URL(path, api), {
    method,
    headers: {
      Origin: frontend.origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response;
}

try {
  const login = await request("/auth/login", "POST", { password: vars.ADMIN_PASSWORD });
  cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!cookie) throw new Error("Local login did not issue a session.");
  const { sites } = await (await request("/sites?includeHidden=1")).json();
  const updates = portfolioContent.map((content) => {
    const existing = sites.find((site) => site.slug === content.slug && site.url === content.url);
    if (!existing) throw new Error(`Expected local site is missing: ${content.slug}`);
    return {
      ...existing,
      name: content.name,
      description: content.description,
      summary: content.summary,
      tags: content.tags,
      isFeatured: content.isFeatured,
      sortOrder: content.sortOrder,
    };
  });
  const reviewSite = sites.find((site) => site.slug === "phase-4-e2e" && site.name === "Phase 4 验收作品");
  if (reviewSite) updates.push({ ...reviewSite, isVisible: false, isFeatured: false });

  const backupDirectory = join(root, ".tmp/content-backups");
  await mkdir(backupDirectory, { recursive: true });
  const backup = join(backupDirectory, `sites-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(), sites }, null, 2));
  console.log(`Backup: ${backup}`);
  let changed = 0;
  for (const site of updates) {
    const existing = sites.find((item) => item.id === site.id);
    if (JSON.stringify(existing) === JSON.stringify(site)) continue;
    await request(`/sites/${site.id}`, "PUT", site);
    changed += 1;
  }
  console.log(`Updated ${changed} local site records; hidden review data is retained.`);
} finally {
  if (cookie) await request("/auth/logout", "POST");
}
