import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session";
import { createTelegramLoginWidgetSession } from "@/lib/telegram-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const session = await createTelegramLoginWidgetSession(
      requestUrl.searchParams,
    );
    const response = NextResponse.redirect(new URL("/dashboard", requestUrl));

    if (session.member.id) {
      setSessionCookie(response, {
        id: session.member.id,
        telegramId: session.member.telegramId,
      });
    }

    return response;
  } catch {
    const redirectUrl = new URL("/sign-in", requestUrl);
    redirectUrl.searchParams.set("error", "telegram_login_failed");

    return NextResponse.redirect(redirectUrl);
  }
}
