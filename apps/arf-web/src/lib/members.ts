import { getDb, members, type Member } from "@arf/db";
import type { TelegramDisplayUser } from "@arf/telegram";
import { getTelegramDisplayName } from "@arf/telegram";
import { isAdminTelegramId } from "@/lib/session";

export interface UpsertTelegramMemberInput {
  telegramUser: TelegramDisplayUser;
  groupStatus: "member" | "not_member" | "unknown";
}

export async function upsertTelegramMember({
  telegramUser,
  groupStatus,
}: UpsertTelegramMemberInput): Promise<Member> {
  const db = getDb();
  const telegramId = String(telegramUser.id);
  const isAdmin = isAdminTelegramId(telegramId);
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
        ...(isAdmin ? { isAdmin: true } : {}),
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
