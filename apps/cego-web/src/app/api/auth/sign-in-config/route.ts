import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/public-url";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, {
    key: "sign-in-config",
    limit: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit);
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? null;
  const authUrl = botUsername
    ? getPublicUrl("/api/telegram/login").toString()
    : null;

  return NextResponse.json({ botUsername, authUrl });
}
