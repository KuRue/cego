import { getDb, members, type Member } from "@arf/db";
import type { TelegramDisplayUser } from "@arf/telegram";
import { getTelegramDisplayName } from "@arf/telegram";
import { isAdminTelegramId } from "@/lib/session";

export interface UpsertTelegramMemberInput {
  telegramUser: TelegramDisplayUser;
  groupStatus: "member" | "not_member" | "unknown";
  telegramGroupAdmin?: boolean | null;
}

export async function upsertTelegramMember({
  telegramUser,
  groupStatus,
  telegramGroupAdmin,
}: UpsertTelegramMemberInput): Promise<Member> {
  const db = getDb();
  const telegramId = String(telegramUser.id);
  const isBootstrapAdmin = isAdminTelegramId(telegramId);
  const isAdmin = isBootstrapAdmin || telegramGroupAdmin === true;
  const shouldUpdateAdmin =
    isBootstrapAdmin || telegramGroupAdmin === true || telegramGroupAdmin === false;
  const profileValues = {
    telegramId,
    telegramUsername: telegramUser.username,
    telegramDisplayName: getTelegramDisplayName(telegramUser),
    telegramPhotoUrl: telegramUser.photo_url,
    groupStatus,
  };

  const inserted = await db
    .insert(members)
    .values({
      ...profileValues,
      isAdmin,
    })
    .onConflictDoUpdate({
      target: members.telegramId,
      set: {
        ...profileValues,
        ...(shouldUpdateAdmin ? { isAdmin } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  const member = inserted[0];

  if (!member) {
    throw new Error("Failed to upsert Telegram member.");
  }

  return member;
}
