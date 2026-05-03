import { NextResponse } from "next/server";
import { TelegramInitDataError } from "@arf/telegram";
import { createTelegramSession } from "@/lib/telegram-session";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

interface TelegramSessionRequest {
  initData?: string;
  useDevMock?: boolean;
}

export async function POST(request: Request) {
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
    const session = await createTelegramSession(body);
    const response = NextResponse.json(session);

    if (session.member.id) {
      setSessionCookie(response, {
        id: session.member.id,
        telegramId: session.member.telegramId,
      });
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
