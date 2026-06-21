export interface SessionPayload {
  authenticated: true;
  issuedAt: string;
}

const textEncoder = new TextEncoder();

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
  if (!cookieValue) {
    return false;
  }

  const [payloadPart, signaturePart] = cookieValue.split(".");

  if (!payloadPart || !signaturePart) {
    return false;
  }

  const expectedSignature = toBase64Url(await sign(payloadPart, secret));

  if (expectedSignature !== signaturePart) {
    return false;
  }

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export function buildSetCookie(value: string, request: Request) {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";
  const sameSitePart = isHttps ? "; SameSite=None; Secure" : "; SameSite=Lax";

  return `admin_session=${value}; Path=/; HttpOnly${sameSitePart}; Max-Age=604800`;
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
