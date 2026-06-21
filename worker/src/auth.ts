import { createSessionCookie, verifySessionCookie, readCookie } from "./cookies";

export interface Env {
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  DB: D1Database;
}

export async function isAuthenticated(request: Request, env: Env) {
  const cookieValue = readCookie(request, "admin_session");
  return verifySessionCookie(cookieValue, env.SESSION_SECRET);
}

export async function issueSession(env: Env) {
  return createSessionCookie(env.SESSION_SECRET);
}
