import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

export async function GET() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? null;
  const authUrl = botUsername
    ? getPublicUrl("/api/telegram/login", await headers()).toString()
    : null;

  return NextResponse.json({ botUsername, authUrl });
}
