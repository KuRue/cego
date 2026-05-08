import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionId } from "@/lib/session";

const CSRF_HEADER = "x-cego-csrf";
const CSRF_COOKIE = "cego_csrf";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for CSRF.");
  return secret;
}

export function generateCsrfToken(sessionId: string): string {
  return createHmac("sha256", getSecret())
    .update(`csrf:${sessionId}`)
    .digest("base64url");
}

export function isValidCsrfRequest(request: Request, sessionId: string): boolean {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const expected = generateCsrfToken(sessionId);

  const a = Buffer.from(headerToken);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  if (!timingSafeEqual(a, b)) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = readAllowedOrigins(request);
    if (!allowed.has(origin)) return false;
  }

  return true;
}

export async function requireValidCsrf(request: Request): Promise<Response | null> {
  const sessionId = await getSessionId();
  if (!sessionId || !isValidCsrfRequest(request, sessionId)) {
    return new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function setCsrfCookie(response: Headers, sessionId: string): void {
  const token = generateCsrfToken(sessionId);
  response.set(
    "set-cookie",
    `${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax; Secure=${process.env.NODE_ENV === "production" ? "true" : "false"}; Max-Age=${60 * 60 * 24 * 30}`,
  );
}

export function clearCsrfCookie(response: Headers): void {
  response.set(
    "set-cookie",
    `${CSRF_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

function readAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  origins.add(new URL(request.url).origin);

  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    try {
      origins.add(new URL(appBaseUrl).origin);
    } catch {}
  }

  return origins;
}
