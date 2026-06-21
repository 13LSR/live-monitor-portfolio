import type { Env } from "./auth";
import { handleAuthMe, handleLogin, handleLogout } from "./routes/auth";
import {
  handleCreateSite,
  handleDeleteSite,
  handleGetSites,
  handleSeedSites,
  handleUpdateSite,
} from "./routes/sites";

function withCors(response: Response, origin: string | null = "*") {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin ?? "*");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getAllowedOrigin(request: Request) {
  return request.headers.get("Origin") ?? "*";
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const origin = getAllowedOrigin(request);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    if (url.pathname === "/auth/login" && request.method === "POST") {
      return withCors(await handleLogin(request, env), origin);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      return withCors(await handleLogout(request), origin);
    }

    if (url.pathname === "/auth/me" && request.method === "GET") {
      return withCors(await handleAuthMe(request, env), origin);
    }

    if (url.pathname === "/sites" && request.method === "GET") {
      return withCors(await handleGetSites(request, env), origin);
    }

    if (url.pathname === "/sites" && request.method === "POST") {
      return withCors(await handleCreateSite(request, env), origin);
    }

    if (url.pathname === "/sites/seed" && request.method === "POST") {
      return withCors(await handleSeedSites(request, env), origin);
    }

    const siteIdMatch = url.pathname.match(/^\/sites\/(\d+)$/);

    if (siteIdMatch) {
      const siteId = Number(siteIdMatch[1]);

      if (request.method === "PUT") {
        return withCors(await handleUpdateSite(request, env, siteId), origin);
      }

      if (request.method === "DELETE") {
        return withCors(await handleDeleteSite(request, env, siteId), origin);
      }
    }

    return withCors(
      Response.json({ ok: false, error: "Not found" }, { status: 404 }),
      origin
    );
  },
};

export default worker;
