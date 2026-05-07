import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "cego_session";

async function verifySessionAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(encodedPayload));
  if (!valid) return false;

  try {
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.telegramId || !payload.expiresAt || payload.expiresAt < Date.now()) return false;

    const adminIds = (process.env.CEGO_ADMIN_TELEGRAM_IDS ?? "")
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    return adminIds.includes(payload.telegramId);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (!isAdminRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  const isAdmin = await verifySessionAdmin(request);

  if (!isAdmin) {
    if (isAdminApiRoute) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
