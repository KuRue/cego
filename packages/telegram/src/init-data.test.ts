import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTelegramInitData } from "./init-data";

const BOT_TOKEN = "123456:cego-test-token";
const NOW_SECONDS = 1_800_000_000;

describe("verifyTelegramInitData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_SECONDS * 1000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes Telegram's third-party signature field in bot-token hash validation", () => {
    const params = signTelegramInitData({
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify({
        id: 100000001,
        first_name: "cego",
        username: "cego_dev",
      }),
      auth_date: String(NOW_SECONDS),
      signature: "telegram-third-party-signature",
    });

    const verified = verifyTelegramInitData(params.toString(), BOT_TOKEN);

    expect(verified.user.id).toBe(100000001);
    expect(verified.raw.signature).toBe("telegram-third-party-signature");
  });
});

function signTelegramInitData(fields: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);
  return params;
}
