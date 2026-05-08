import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/public-url";
import { checkRateLimit } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { createTelegramLoginWidgetSession } from "@/lib/telegram-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rateLimit = checkRateLimit(request, {
    key: "telegram-login",
    limit: 30,
    windowMs: 5 * 60_000,
  });

  if (!rateLimit.ok) {
    const redirectUrl = getPublicUrl("/sign-in");
    redirectUrl.searchParams.set("error", "rate_limited");

    return NextResponse.redirect(redirectUrl);
  }

  try {
    const session = await createTelegramLoginWidgetSession(
      requestUrl.searchParams,
    );
    const response = NextResponse.redirect(getPublicUrl("/dashboard"));

    if (session.member.id) {
      setSessionCookie(response, {
        id: session.member.id,
        telegramId: session.member.telegramId,
      });
    }

    return response;
  } catch {
    const redirectUrl = getPublicUrl("/sign-in");
    redirectUrl.searchParams.set("error", "telegram_login_failed");

    return NextResponse.redirect(redirectUrl);
  }
}
