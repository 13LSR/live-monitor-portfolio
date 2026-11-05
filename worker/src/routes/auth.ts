import type { Env } from "../auth.ts";
import { buildClearCookie, buildSetCookie } from "../cookies.ts";
import { isAuthenticated, issueSession } from "../auth.ts";
import { readJsonObject } from "../http.ts";
import { clearLoginAttempts, reserveLoginAttempt } from "../login-limiter.ts";

export async function handleLogin(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return Response.json({ ok: false, error: "Authentication is not configured" }, { status: 503 });
  }
  const body = await readJsonObject(request, 4096);
  if (typeof body.password !== "string" || !body.password || body.password.length > 1024) {
    return Response.json({ ok: false, error: "Invalid password format" }, { status: 400 });
  }
  let attempt;
  try {
    attempt = await reserveLoginAttempt(request, env);
  } catch {
    return Response.json({ ok: false, error: "Login temporarily unavailable" }, { status: 503 });
  }
  if (!attempt.allowed) {
    return Response.json({ ok: false, error: "Too many login attempts" }, {
      status: 429, headers: { "Retry-After": String(attempt.retryAfter) },
    });
  }

  if (!(await passwordsMatch(body.password, env.ADMIN_PASSWORD))) {
    return Response.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }

  await clearLoginAttempts(env, attempt.clientKey);
  const session = await issueSession(env);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSetCookie(session, request),
    },
  });
}

export async function handleLogout(request: Request) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildClearCookie(request),
    },
  });
}

export async function handleAuthMe(request: Request, env: Env) {
  const authenticated = await isAuthenticated(request, env);
  return Response.json({ authenticated });
}

async function passwordsMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}
