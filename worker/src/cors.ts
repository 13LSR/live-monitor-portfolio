import type { Env } from "./auth";
import { isLocalRequest } from "./http.ts";

const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedMethods = "GET,POST,PUT,DELETE,OPTIONS";

export function getAllowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") return null;
  const configured = (env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim());
  const origins = new Set([
    new URL(request.url).origin,
    ...configured,
    ...(isLocalRequest(request) ? localOrigins : []),
  ]);
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) return null;
    return origins.has(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function checkRequestOrigin(request: Request, origin: string | null) {
  const requiresOrigin = !["GET", "HEAD"].includes(request.method);
  if ((requiresOrigin || request.headers.has("Origin")) && !origin) {
    return Response.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  if (request.method === "OPTIONS") {
    const method = request.headers.get("Access-Control-Request-Method");
    const headers = request.headers.get("Access-Control-Request-Headers") ?? "";
    if (
      !method || !allowedMethods.split(",").includes(method) ||
      headers.split(",").some((header) => header.trim() && header.trim().toLowerCase() !== "content-type")
    ) {
      return Response.json({ ok: false, error: "Preflight not allowed" }, { status: 403 });
    }
    return new Response(null, { status: 204 });
  }
  return null;
}

export function withCors(response: Response, request: Request, origin: string | null) {
  const headers = new Headers(response.headers);
  headers.append("Vary", "Origin");
  headers.set("X-Content-Type-Options", "nosniff");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Methods", allowedMethods);
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }
  const url = new URL(request.url);
  if (url.pathname.startsWith("/auth/") || url.searchParams.has("includeHidden")) headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
