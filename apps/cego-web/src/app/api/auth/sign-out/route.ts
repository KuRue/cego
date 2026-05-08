import { NextResponse } from "next/server";
import { isValidCsrfRequest } from "@/lib/csrf";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    key: "sign-out",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit);
  }

  if (!isValidCsrfRequest(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: "cego_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
