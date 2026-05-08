import { NextResponse } from "next/server";
import { TelegramInitDataError, verifyTelegramInitData } from "@cego/telegram";
import { createTelegramSession } from "@/lib/telegram-session";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { setCsrfCookie } from "@/lib/csrf";

export const runtime = "nodejs";

interface TelegramSessionRequest {
  initData?: string;
  useDevMock?: boolean;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    key: "telegram-session",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit);
  }

  let body: TelegramSessionRequest;

  try {
    body = (await request.json()) as TelegramSessionRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const telegramId = readVerifiedTelegramIdForRateLimit(body);

    if (telegramId) {
      const userRateLimit = checkRateLimit(request, {
        key: "telegram-session-user",
        limit: 30,
        windowMs: 60_000,
        identity: `tg:${telegramId}`,
      });
      if (!userRateLimit.ok) {
        return rateLimitResponse(userRateLimit);
      }
    }

    const session = await createTelegramSession(body);

    const response = NextResponse.json(session);

    if (session.member.id) {
      const sessionPayload = setSessionCookie(response, {
        id: session.member.id,
        telegramId: session.member.telegramId,
      });
      setCsrfCookie(response.headers, sessionPayload);
    }

    return response;
  } catch (error) {
    if (error instanceof TelegramInitDataError) {
      console.warn("Telegram Mini App session rejected.", {
        reason: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to create session.";

    console.error("Telegram Mini App session failed.", {
      reason: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function readVerifiedTelegramIdForRateLimit(
  body: TelegramSessionRequest,
): string | null {
  if (
    body.useDevMock === true &&
    process.env.NODE_ENV !== "production" &&
    process.env.CEGO_DEV_TELEGRAM_MOCK === "true"
  ) {
    return "dev_mock";
  }

  if (!body.initData) return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new TelegramInitDataError("TELEGRAM_BOT_TOKEN is not configured.");
  }

  return String(verifyTelegramInitData(body.initData, botToken).user.id);
}
