import {
  getTelegramChatAdministrators,
  getDevTelegramInitData,
  getTelegramGroupStatus,
  TelegramBotApiError,
  TelegramInitDataError,
  TelegramLoginWidgetError,
  verifyTelegramLoginWidgetData,
  type TelegramDisplayUser,
  verifyTelegramInitData,
} from "@cego/telegram";
import { upsertTelegramMember } from "@/lib/members";

export type TelegramSessionStatus = "accepted" | "blocked" | "dev_mock";

export interface TelegramSessionResult {
  status: TelegramSessionStatus;
  member: {
    id?: string;
    telegramId: string;
    telegramUsername?: string | null;
    telegramDisplayName: string;
    telegramPhotoUrl?: string | null;
    groupStatus: "member" | "not_member" | "unknown";
    isAdmin?: boolean;
  };
}

export async function createTelegramSession({
  initData,
  useDevMock,
}: {
  initData?: string;
  useDevMock?: boolean;
}): Promise<TelegramSessionResult> {
  if (isDevMockEnabled(useDevMock)) {
    const verifiedInitData = getDevTelegramInitData();
    const member = await upsertTelegramMember({
      telegramUser: verifiedInitData.user,
      groupStatus: "member",
      telegramGroupAdmin: null,
    });

    return {
      status: "dev_mock",
      member: {
        id: member.id,
        telegramId: member.telegramId,
        telegramUsername: member.telegramUsername,
        telegramDisplayName: member.telegramDisplayName,
        telegramPhotoUrl: member.telegramPhotoUrl,
        groupStatus: member.groupStatus,
        isAdmin: member.isAdmin,
      },
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new TelegramInitDataError("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const verifiedInitData = verifyTelegramInitData(initData ?? "", botToken);
  const groupStatus = await resolveTelegramGroupStatus(
    verifiedInitData.user,
    botToken,
  );
  const telegramGroupAdmin = await resolveTelegramGroupAdminStatus(
    verifiedInitData.user,
    botToken,
  );
  const member = await upsertTelegramMember({
    telegramUser: verifiedInitData.user,
    groupStatus,
    telegramGroupAdmin,
  });

  return {
    status: groupStatus === "member" ? "accepted" : "blocked",
    member: {
      id: member.id,
      telegramId: member.telegramId,
      telegramUsername: member.telegramUsername,
      telegramDisplayName: member.telegramDisplayName,
      telegramPhotoUrl: member.telegramPhotoUrl,
      groupStatus: member.groupStatus,
      isAdmin: member.isAdmin,
    },
  };
}

export async function createTelegramLoginWidgetSession(
  searchParams: URLSearchParams,
): Promise<TelegramSessionResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new TelegramLoginWidgetError("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const verifiedLoginData = verifyTelegramLoginWidgetData(searchParams, botToken);
  const groupStatus = await resolveTelegramGroupStatus(
    verifiedLoginData.user,
    botToken,
  );
  const telegramGroupAdmin = await resolveTelegramGroupAdminStatus(
    verifiedLoginData.user,
    botToken,
  );
  const member = await upsertTelegramMember({
    telegramUser: verifiedLoginData.user,
    groupStatus,
    telegramGroupAdmin,
  });

  return {
    status: groupStatus === "member" ? "accepted" : "blocked",
    member: {
      id: member.id,
      telegramId: member.telegramId,
      telegramUsername: member.telegramUsername,
      telegramDisplayName: member.telegramDisplayName,
      telegramPhotoUrl: member.telegramPhotoUrl,
      groupStatus: member.groupStatus,
      isAdmin: member.isAdmin,
    },
  };
}

function isDevMockEnabled(useDevMock?: boolean): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CEGO_DEV_TELEGRAM_MOCK === "true" &&
    useDevMock === true
  );
}

async function resolveTelegramGroupStatus(
  telegramUser: Pick<TelegramDisplayUser, "id">,
  botToken: string,
): Promise<"member" | "not_member" | "unknown"> {
  const chatId = process.env.TELEGRAM_GROUP_ID;

  if (!chatId) {
    return "unknown";
  }

  try {
    return await getTelegramGroupStatus({
      botToken,
      chatId,
      userId: getTelegramBotApiUserId(telegramUser.id),
    });
  } catch (error) {
    if (error instanceof TelegramBotApiError) {
      console.warn("Telegram group membership check failed.", {
        chatId,
        telegramId: String(telegramUser.id),
        reason: error.message,
      });
      return "unknown";
    }

    throw error;
  }
}

async function resolveTelegramGroupAdminStatus(
  telegramUser: Pick<TelegramDisplayUser, "id">,
  botToken: string,
): Promise<boolean | null> {
  const chatId = process.env.TELEGRAM_GROUP_ID;

  if (!chatId) {
    return null;
  }

  const telegramId = String(telegramUser.id);

  try {
    const administrators = await getTelegramChatAdministrators({
      botToken,
      chatId,
    });

    return administrators.some(
      (administrator) => String(administrator.user.id) === telegramId,
    );
  } catch (error) {
    if (error instanceof TelegramBotApiError) {
      console.warn("Telegram group admin lookup failed.", {
        chatId,
        telegramId,
        reason: error.message,
      });
      return false;
    }

    throw error;
  }
}

function getTelegramBotApiUserId(telegramId: string | number): number {
  const userId = Number(telegramId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TelegramBotApiError("Telegram user ID is invalid.");
  }

  return userId;
}
