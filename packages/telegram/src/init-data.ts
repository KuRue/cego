import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramDisplayUser {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramInitUser extends TelegramDisplayUser {
  id: number;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

export interface VerifiedTelegramInitData {
  authDate: Date;
  queryId?: string;
  startParam?: string;
  user: TelegramInitUser;
  raw: Record<string, string>;
}

export class TelegramInitDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramInitDataError";
  }
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60,
): VerifiedTelegramInitData {
  if (!initData) {
    throw new TelegramInitDataError("Telegram init data is required.");
  }

  if (!botToken) {
    throw new TelegramInitDataError("Telegram bot token is required.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new TelegramInitDataError("Telegram init data hash is missing.");
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeCompareHex(hash, expectedHash)) {
    throw new TelegramInitDataError("Telegram init data signature is invalid.");
  }

  const authDateValue = params.get("auth_date");
  const authDateSeconds = authDateValue ? Number(authDateValue) : Number.NaN;

  if (!Number.isFinite(authDateSeconds)) {
    throw new TelegramInitDataError("Telegram init data auth_date is invalid.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - authDateSeconds;

  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) {
    throw new TelegramInitDataError("Telegram init data is expired.");
  }

  const userJson = params.get("user");

  if (!userJson) {
    throw new TelegramInitDataError("Telegram init data user is missing.");
  }

  let user: TelegramInitUser;

  try {
    user = JSON.parse(userJson) as TelegramInitUser;
  } catch {
    throw new TelegramInitDataError("Telegram init data user is invalid JSON.");
  }

  if (!Number.isFinite(user.id)) {
    throw new TelegramInitDataError("Telegram init data user ID is invalid.");
  }

  return {
    authDate: new Date(authDateSeconds * 1000),
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    user,
    raw: Object.fromEntries(params.entries()),
  };
}

function safeCompareHex(actualHex: string, expectedHex: string): boolean {
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function getTelegramDisplayName(user: TelegramDisplayUser): string {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return displayName || user.username || String(user.id);
}
