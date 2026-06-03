import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "node:crypto";

/**
 * Why this exists: the CSRF cookie (cego_csrf) is set ONCE inside the sign-in
 * route handlers. Users whose session predates the CSRF rollout — or who had
 * the cookie cleared by a privacy extension — end up with a valid session
 * cookie but no CSRF cookie, which makes every state-changing POST 403. This
 * middleware repairs them: if there's a valid session and no CSRF cookie, it
 * re-issues the CSRF cookie on the response.
 *
 * Runs on Node runtime (Next 15+) so we can reuse node:crypto. Skips static
 * assets and uploads to avoid touching hot static paths.
 */

export const config = {
  matcher: [
    // Skip Next internals, API routes (those set the cookie themselves at
    // sign-in), uploads, favicon, and any extension-bearing path (static files).
    "/((?!_next/|api/|uploads/|favicon\\.ico|.*\\..*).*)",
  ],
};

export const runtime = "nodejs";

const SESSION_COOKIE = "cego_session";
const CSRF_COOKIE = "cego_csrf";

interface SessionPayload {
  memberId: string;
  telegramId: string;
  expiresAt: number;
}

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Already has a CSRF cookie? Nothing to do.
  if (request.cookies.get(CSRF_COOKIE)) {
    return response;
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return response;
  }

  const session = verifySessionToken(sessionToken);
  if (!session) {
    return response;
  }

  const maxAge = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
  if (maxAge === 0) {
    return response;
  }

  const csrf = generateCsrfToken(session);
  response.cookies.set({
    name: CSRF_COOKIE,
    value: csrf,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });

  return response;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  if (expectedSignature.length !== signature.length) return null;

  // Constant-time compare via length-checked equality. createHmac output is
  // base64url so it's safe to compare directly.
  let mismatch = 0;
  for (let i = 0; i < expectedSignature.length; i += 1) {
    mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      !payload.memberId ||
      !payload.telegramId ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function generateCsrfToken(session: Pick<SessionPayload, "memberId" | "expiresAt">): string {
  return createHmac("sha256", getSecret())
    .update(`csrf:${session.memberId}:${session.expiresAt}`)
    .digest("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for session signing.");
  return secret;
}
