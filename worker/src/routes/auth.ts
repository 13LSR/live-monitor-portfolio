import type { Env } from "../auth";
import { buildClearCookie, buildSetCookie } from "../cookies";
import { isAuthenticated, issueSession } from "../auth";

interface LoginBody {
  password?: string;
}

export async function handleLogin(request: Request, env: Env) {
  const body = (await request.json()) as LoginBody;

  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return Response.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }

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
