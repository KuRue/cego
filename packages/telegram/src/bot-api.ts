export type TelegramChatMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramChatMember {
  status: TelegramChatMemberStatus;
  is_member?: boolean;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChatAdministrator {
  status: "creator" | "administrator";
  user: TelegramUser;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export class TelegramBotApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramBotApiError";
  }
}

const API_TIMEOUT_MS = 8000;
const API_MAX_RETRIES = 2;

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= API_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);

      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const isRetryable = isAbort || (err instanceof TypeError);

      if (isRetryable && attempt < API_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      throw new TelegramBotApiError(
        isAbort
          ? "Telegram API request timed out."
          : err instanceof Error
            ? err.message
            : "Telegram API request failed.",
      );
    }
  }

  throw new TelegramBotApiError("Telegram API request failed after retries.");
}

export async function getTelegramBotInfo({
  botToken,
}: {
  botToken: string;
}): Promise<TelegramBotInfo> {
  if (!botToken) {
    throw new TelegramBotApiError("Telegram bot token is required.");
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await fetchWithRetry(endpoint);
  const payload = (await response.json()) as TelegramApiResponse<TelegramBotInfo>;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new TelegramBotApiError(payload.description ?? "Telegram getMe failed.");
  }

  return payload.result;
}

export async function getTelegramChatAdministrators({
  botToken,
  chatId,
}: {
  botToken: string;
  chatId: string;
}): Promise<TelegramChatAdministrator[]> {
  if (!botToken) {
    throw new TelegramBotApiError("Telegram bot token is required.");
  }

  if (!chatId) {
    throw new TelegramBotApiError("Telegram group ID is required.");
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/getChatAdministrators`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
    }),
  });
  const payload = (await response.json()) as TelegramApiResponse<
    TelegramChatAdministrator[]
  >;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new TelegramBotApiError(
      payload.description ?? "Telegram getChatAdministrators failed.",
    );
  }

  return payload.result;
}

export async function getTelegramGroupStatus({
  botToken,
  chatId,
  userId,
}: {
  botToken: string;
  chatId: string;
  userId: number;
}): Promise<"member" | "not_member"> {
  if (!botToken) {
    throw new TelegramBotApiError("Telegram bot token is required.");
  }

  if (!chatId) {
    throw new TelegramBotApiError("Telegram group ID is required.");
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/getChatMember`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
    }),
  });

  const payload = (await response.json()) as TelegramApiResponse<TelegramChatMember>;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new TelegramBotApiError(
      payload.description ?? "Telegram getChatMember failed.",
    );
  }

  return isActiveChatMember(payload.result) ? "member" : "not_member";
}

function isActiveChatMember(member: TelegramChatMember): boolean {
  if (member.status === "restricted") {
    return member.is_member === true;
  }

  return ["creator", "administrator", "member"].includes(member.status);
}

interface TelegramMessage {
  message_id: number;
}

export function escapeTelegramHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

export function telegramHtmlBold(value: string): string {
  return `<strong>${escapeTelegramHtml(value)}</strong>`;
}

export async function sendTelegramMessage({
  botToken,
  chatId,
  text,
  parseMode,
}: {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: "Markdown" | "HTML";
}): Promise<string> {
  if (!botToken) {
    throw new TelegramBotApiError("Telegram bot token is required.");
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
    }),
  });

  const payload = (await response.json()) as TelegramApiResponse<TelegramMessage>;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new TelegramBotApiError(
      payload.description ?? "Telegram sendMessage failed.",
    );
  }

  return String(payload.result.message_id);
}
