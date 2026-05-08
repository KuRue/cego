import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { eq, getDb, members, type Member } from "@cego/db";

const SESSION_COOKIE_NAME = "cego_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  memberId: string;
  telegramId: string;
  expiresAt: number;
}

export function isAdminTelegramId(telegramId: string): boolean {
  return (process.env.CEGO_ADMIN_TELEGRAM_IDS ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(telegramId);
}

export function setSessionCookie(
  response: NextResponse,
  member: Pick<Member, "id" | "telegramId">,
): SessionPayload {
  const payload = {
    memberId: member.id,
    telegramId: member.telegramId,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return payload;
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function getSessionId(): Promise<string | null> {
  const payload = await getSessionPayload();
  return payload?.memberId ?? null;
}

export async function getCurrentMember(): Promise<Member | null> {
  const payload = await getSessionPayload();

  if (!payload) {
    return null;
  }

  const db = getDb();
  const found = await db
    .select()
    .from(members)
    .where(eq(members.id, payload.memberId))
    .limit(1);
  const member = found[0];

  if (!member || member.telegramId !== payload.telegramId) {
    return null;
  }

  return member;
}

export async function requireCurrentMember(): Promise<Member> {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/sign-in");
  }

  return member;
}

export async function requireAdminMember(): Promise<Member> {
  const member = await requireCurrentMember();

  if (!member.isAdmin) {
    redirect("/dashboard");
  }

  return member;
}

function createSessionToken(payload: SessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeCompare(signature, sign(encodedPayload))) {
    return null;
  }

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

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is required for cego sessions.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
