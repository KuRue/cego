import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { TelegramDisplayUser } from "./init-data";

export interface TelegramLoginWidgetUser extends TelegramDisplayUser {
  id: string;
  first_name: string;
}

export interface VerifiedTelegramLoginWidgetData {
  authDate: Date;
  user: TelegramLoginWidgetUser;
  raw: Record<string, string>;
}

export class TelegramLoginWidgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramLoginWidgetError";
  }
}

export function verifyTelegramLoginWidgetData(
  input: URLSearchParams | Record<string, string> | string,
  botToken: string,
  maxAgeSeconds = 60 * 60,
): VerifiedTelegramLoginWidgetData {
  if (!botToken) {
    throw new TelegramLoginWidgetError("Telegram bot token is required.");
  }

  const params = normalizeParams(input);
  const hash = params.get("hash");

  if (!hash) {
    throw new TelegramLoginWidgetError("Telegram login hash is missing.");
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeCompareHex(hash, expectedHash)) {
    throw new TelegramLoginWidgetError("Telegram login signature is invalid.");
  }

  const authDateValue = params.get("auth_date");
  const authDateSeconds = authDateValue ? Number(authDateValue) : Number.NaN;

  if (!Number.isFinite(authDateSeconds)) {
    throw new TelegramLoginWidgetError("Telegram login auth_date is invalid.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - authDateSeconds;

  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) {
    throw new TelegramLoginWidgetError("Telegram login data is expired.");
  }

  const id = params.get("id")?.trim() ?? "";
  const firstName = params.get("first_name")?.trim() ?? "";

  if (!/^\d+$/.test(id)) {
    throw new TelegramLoginWidgetError("Telegram login user ID is invalid.");
  }

  if (!firstName) {
    throw new TelegramLoginWidgetError("Telegram login first_name is missing.");
  }

  return {
    authDate: new Date(authDateSeconds * 1000),
    user: {
      id,
      first_name: firstName,
      last_name: emptyToUndefined(params.get("last_name")),
      username: emptyToUndefined(params.get("username")),
      photo_url: emptyToUndefined(params.get("photo_url")),
    },
    raw: Object.fromEntries(params.entries()),
  };
}

function normalizeParams(
  input: URLSearchParams | Record<string, string> | string,
): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  if (typeof input === "string") {
    return new URLSearchParams(input);
  }

  return new URLSearchParams(input);
}

function emptyToUndefined(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function safeCompareHex(actualHex: string, expectedHex: string): boolean {
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
