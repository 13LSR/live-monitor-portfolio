import {
  createSessionCookie,
  readCookie,
  verifySessionCookie,
} from "./cookies.ts";

export interface Env {
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  DB: D1Database;
  PUBLIC_GOOD_CACHE_TTL_SECONDS?: string;
  PUBLIC_GOOD_FIXTURE_JSON?: string;
}

export async function isAuthenticated(request: Request, env: Env) {
  const cookieValue = readCookie(request, "admin_session");
  return verifySessionCookie(cookieValue, env.SESSION_SECRET);
}

export async function issueSession(env: Env) {
  return createSessionCookie(env.SESSION_SECRET);
}
