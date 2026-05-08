import { describe, expect, it } from "vitest";

import { escapeTelegramHtml, telegramHtmlBold } from "./bot-api";

describe("Telegram HTML formatting", () => {
  it("escapes Telegram HTML text nodes", () => {
    expect(escapeTelegramHtml(`[click](https://evil.example) & <script>`)).toBe(
      `[click](https://evil.example) &amp; &lt;script&gt;`,
    );
  });

  it("escapes quotes for safe attribute interpolation", () => {
    expect(escapeTelegramHtml(`he said "hello" and 'bye'`)).toBe(
      `he said &quot;hello&quot; and &#39;bye&#39;`,
    );
  });

  it("escapes text before wrapping it in bold tags", () => {
    expect(telegramHtmlBold(`Cego *Retreat* </strong><a href="https://evil.example">x</a>`)).toBe(
      `<strong>Cego *Retreat* &lt;/strong&gt;&lt;a href=&quot;https://evil.example&quot;&gt;x&lt;/a&gt;</strong>`,
    );
  });
});
