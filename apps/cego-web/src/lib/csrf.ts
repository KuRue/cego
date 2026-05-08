import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionPayload, type SessionPayload } from "@/lib/session";

const CSRF_HEADER = "x-cego-csrf";
const CSRF_COOKIE = "cego_csrf";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for CSRF.");
  return secret;
}

type CsrfSession = Pick<SessionPayload, "memberId" | "expiresAt">;

export function generateCsrfToken(session: CsrfSession): string {
  return createHmac("sha256", getSecret())
    .update(`csrf:${session.memberId}:${session.expiresAt}`)
    .digest("base64url");
}

export function isValidCsrfRequest(
  request: Request,
  session: CsrfSession,
): boolean {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const expected = generateCsrfToken(session);

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
  const session = await getSessionPayload();
  if (!session || !isValidCsrfRequest(request, session)) {
    return new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function setCsrfCookie(response: Headers, session: CsrfSession): void {
  const token = generateCsrfToken(session);
  const maxAge = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
  response.append(
    "set-cookie",
    `${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}; Max-Age=${maxAge}`,
  );
}

export function clearCsrfCookie(response: Headers): void {
  response.append(
    "set-cookie",
    `${CSRF_COOKIE}=; Path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}; Max-Age=0`,
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
