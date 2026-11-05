import type { Env } from "./auth";
import { checkRequestOrigin, getAllowedOrigin, withCors } from "./cors.ts";
import { HttpError } from "./http.ts";
import { handlePublicGood } from "./public-good.ts";
import { handleAuthMe, handleLogin, handleLogout } from "./routes/auth.ts";
import {
  handleCreateSite,
  handleDeleteSite,
  handleGetSites,
  handleSeedSites,
  handleUpdateSite,
} from "./routes/sites.ts";

async function route(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === "/auth/login" && request.method === "POST") return handleLogin(request, env);
  if (url.pathname === "/auth/logout" && request.method === "POST") return handleLogout(request);
  if (url.pathname === "/auth/me" && request.method === "GET") return handleAuthMe(request, env);
  if (url.pathname === "/sites" && request.method === "GET") return handleGetSites(request, env);
  if (url.pathname === "/public-good" && request.method === "GET") return handlePublicGood(request, env);
  if (url.pathname === "/sites" && request.method === "POST") return handleCreateSite(request, env);
  if (url.pathname === "/sites/seed" && request.method === "POST") return handleSeedSites(request, env);

  const siteIdMatch = url.pathname.match(/^\/sites\/(\d+)$/);
  if (siteIdMatch) {
    const id = Number(siteIdMatch[1]);
    if (!Number.isSafeInteger(id)) throw new HttpError(400, "Invalid site ID");
    if (request.method === "PUT") return handleUpdateSite(request, env, id);
    if (request.method === "DELETE") return handleDeleteSite(request, env, id);
  }
  return Response.json({ ok: false, error: "Not found" }, { status: 404 });
}

const worker = {
  async fetch(request: Request, env: Env) {
    const origin = getAllowedOrigin(request, env);
    let response: Response;
    try {
      response = checkRequestOrigin(request, origin) ?? await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        response = Response.json({ ok: false, error: error.message }, { status: error.status });
      } else {
        console.error("Worker request failed", error instanceof Error ? error.name : "Unknown error");
        response = Response.json({ ok: false, error: "Service temporarily unavailable" }, { status: 503 });
      }
    }
    return withCors(response, request, origin);
  },
};

export default worker;
