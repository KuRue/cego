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

export async function getTelegramBotInfo({
  botToken,
}: {
  botToken: string;
}): Promise<TelegramBotInfo> {
  if (!botToken) {
    throw new TelegramBotApiError("Telegram bot token is required.");
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await fetch(endpoint);
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
  const response = await fetch(endpoint, {
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
  const response = await fetch(endpoint, {
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
