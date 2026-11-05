export interface SessionPayload {
  authenticated: true;
  issuedAt: string;
}

const textEncoder = new TextEncoder();
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function toBase64Url(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const binary = String.fromCharCode(...bytes);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(value));
}

export async function createSessionCookie(secret: string) {
  const payload: SessionPayload = {
    authenticated: true,
    issuedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);
  const payloadPart = toBase64Url(textEncoder.encode(serialized));
  const signaturePart = toBase64Url(await sign(payloadPart, secret));

  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionCookie(
  cookieValue: string | null,
  secret: string
) {
  if (!cookieValue || cookieValue.length > 2048 || !secret) {
    return false;
  }

  const parts = cookieValue.split(".");
  const [payloadPart, signaturePart] = parts;

  if (parts.length !== 2 || !payloadPart || !signaturePart) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key, fromBase64Url(signaturePart), textEncoder.encode(payloadPart)
    );
    if (!valid) return false;
    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload || typeof payload.issuedAt !== "string") return false;
    const age = Date.now() - Date.parse(payload.issuedAt);
    return payload.authenticated === true && Number.isFinite(age) && age >= 0 && age < SESSION_MAX_AGE_SECONDS * 1000;
  } catch {
    return false;
  }
}

export function buildSetCookie(value: string, request: Request) {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";
  const sameSitePart = isHttps ? "; SameSite=None; Secure" : "; SameSite=Lax";

  return `admin_session=${value}; Path=/; HttpOnly${sameSitePart}; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function buildClearCookie(request: Request) {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";
  const sameSitePart = isHttps ? "; SameSite=None; Secure" : "; SameSite=Lax";

  return `admin_session=; Path=/; HttpOnly${sameSitePart}; Max-Age=0`;
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const pairs = cookieHeader.split(";").map((item) => item.trim());
  const match = pairs.find((item) => item.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : null;
}
