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

export type CsrfFailureReason =
  | "missing_header"
  | "token_length_mismatch"
  | "token_mismatch"
  | "origin_disallowed";

export function isValidCsrfRequest(
  request: Request,
  session: CsrfSession,
): { ok: true } | { ok: false; reason: CsrfFailureReason } {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return { ok: false, reason: "missing_header" };

  const expected = generateCsrfToken(session);

  const a = Buffer.from(headerToken);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "token_length_mismatch" };

  if (!timingSafeEqual(a, b)) return { ok: false, reason: "token_mismatch" };

  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = readAllowedOrigins(request);
    if (!allowed.has(origin)) return { ok: false, reason: "origin_disallowed" };
  }

  return { ok: true };
}

export async function requireValidCsrf(request: Request): Promise<Response | null> {
  const session = await getSessionPayload();

  if (!session) {
    console.warn("[csrf] reject: no session payload", { url: request.url });
    return forbidden();
  }

  const result = isValidCsrfRequest(request, session);

  if (!result.ok) {
    console.warn("[csrf] reject", {
      url: request.url,
      reason: result.reason,
      origin: request.headers.get("origin"),
      hasHeaderToken: !!request.headers.get(CSRF_HEADER),
      headerTokenLength: request.headers.get(CSRF_HEADER)?.length,
      allowedOrigins: Array.from(readAllowedOrigins(request)),
    });
    return forbidden();
  }

  return null;
}

function forbidden(): Response {
  return new Response(JSON.stringify({ error: "Forbidden." }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
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
