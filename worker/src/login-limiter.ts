import type { Env } from "./auth";
import { isLocalRequest } from "./http.ts";

export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_WINDOW_SECONDS = 600;

export async function reserveLoginAttempt(request: Request, env: Env, now = Date.now()) {
  // Cloudflare supplies this header at the edge. Never trust X-Forwarded-For.
  // Local callers share a bucket, regardless of headers they supply.
  const client = isLocalRequest(request)
    ? "local"
    : request.headers.get("CF-Connecting-IP") ?? "unidentified";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`login:${client}`));
  const clientKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expiresAt = now + LOGIN_WINDOW_SECONDS * 1000;
  // Reserve in a transaction before checking credentials, including concurrent attempts.
  const results = await env.DB.batch<{ attempts: number; expires_at: number }>([
    env.DB.prepare("DELETE FROM admin_login_attempts WHERE expires_at <= ?").bind(now),
    env.DB.prepare(`
      INSERT INTO admin_login_attempts (client_key, attempts, expires_at)
      VALUES (?, 1, ?)
      ON CONFLICT(client_key) DO UPDATE SET attempts = attempts + 1
      RETURNING attempts, expires_at
    `).bind(clientKey, expiresAt),
  ]);
  const record = results[1].results[0];
  if (!record) throw new Error("Login rate limit storage unavailable");
  return {
    clientKey,
    allowed: record.attempts <= LOGIN_ATTEMPT_LIMIT,
    retryAfter: Math.max(1, Math.ceil((record.expires_at - now) / 1000)),
  };
}

export async function clearLoginAttempts(env: Env, clientKey: string) {
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").bind(clientKey).run();
}
