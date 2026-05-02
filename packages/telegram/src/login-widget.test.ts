import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTelegramDisplayName } from "./init-data";
import {
  TelegramLoginWidgetError,
  verifyTelegramLoginWidgetData,
} from "./login-widget";

const BOT_TOKEN = "123456:arf-test-token";
const NOW_SECONDS = 1_800_000_000;

describe("verifyTelegramLoginWidgetData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_SECONDS * 1000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a valid Telegram Login Widget payload", () => {
    const params = signTelegramLoginParams({
      id: "100000001",
      first_name: "ARF",
      last_name: "Developer",
      username: "arf_dev",
      photo_url: "https://t.me/i/userpic/320/arf.jpg",
      auth_date: String(NOW_SECONDS),
    });

    const verified = verifyTelegramLoginWidgetData(params, BOT_TOKEN);

    expect(verified.authDate).toEqual(new Date(NOW_SECONDS * 1000));
    expect(verified.user).toEqual({
      id: "100000001",
      first_name: "ARF",
      last_name: "Developer",
      username: "arf_dev",
      photo_url: "https://t.me/i/userpic/320/arf.jpg",
    });
    expect(getTelegramDisplayName(verified.user)).toBe("ARF Developer");
  });

  it("rejects an invalid hash", () => {
    const params = signTelegramLoginParams({
      id: "100000001",
      first_name: "ARF",
      auth_date: String(NOW_SECONDS),
    });
    params.set("hash", "bad-hash");

    expect(() => verifyTelegramLoginWidgetData(params, BOT_TOKEN)).toThrow(
      TelegramLoginWidgetError,
    );
  });

  it("rejects expired login data", () => {
    const params = signTelegramLoginParams({
      id: "100000001",
      first_name: "ARF",
      auth_date: String(NOW_SECONDS - 3601),
    });

    expect(() => verifyTelegramLoginWidgetData(params, BOT_TOKEN)).toThrow(
      "Telegram login data is expired.",
    );
  });

  it("rejects missing required fields", () => {
    const params = signTelegramLoginParams({
      id: "100000001",
      auth_date: String(NOW_SECONDS),
    });

    expect(() => verifyTelegramLoginWidgetData(params, BOT_TOKEN)).toThrow(
      "Telegram login first_name is missing.",
    );
  });

  it("normalizes optional blank profile fields", () => {
    const params = signTelegramLoginParams({
      id: "100000001",
      first_name: "ARF",
      last_name: "",
      username: "",
      photo_url: "",
      auth_date: String(NOW_SECONDS),
    });

    const verified = verifyTelegramLoginWidgetData(params, BOT_TOKEN);

    expect(verified.user).toEqual({
      id: "100000001",
      first_name: "ARF",
      last_name: undefined,
      username: undefined,
      photo_url: undefined,
    });
    expect(getTelegramDisplayName(verified.user)).toBe("ARF");
  });
});

function signTelegramLoginParams(
  fields: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHash("sha256").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);
  return params;
}
