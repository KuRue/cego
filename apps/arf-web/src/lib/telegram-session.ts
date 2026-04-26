import {
  getDevTelegramInitData,
  getTelegramGroupStatus,
  TelegramBotApiError,
  TelegramInitDataError,
  verifyTelegramInitData,
  type VerifiedTelegramInitData,
} from "@arf/telegram";
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

    return {
      status: "dev_mock",
      member: {
        telegramId: String(verifiedInitData.user.id),
        telegramUsername: verifiedInitData.user.username,
        telegramDisplayName: "ARF Developer",
        telegramPhotoUrl: verifiedInitData.user.photo_url,
        groupStatus: "member",
      },
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new TelegramInitDataError("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const verifiedInitData = verifyTelegramInitData(initData ?? "", botToken);
  const groupStatus = await resolveTelegramGroupStatus(verifiedInitData, botToken);
  const member = await upsertTelegramMember({ verifiedInitData, groupStatus });

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
    process.env.ARF_DEV_TELEGRAM_MOCK === "true" &&
    useDevMock === true
  );
}

async function resolveTelegramGroupStatus(
  verifiedInitData: VerifiedTelegramInitData,
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
      userId: verifiedInitData.user.id,
    });
  } catch (error) {
    if (error instanceof TelegramBotApiError) {
      return "unknown";
    }

    throw error;
  }
}

