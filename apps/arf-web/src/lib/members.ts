import { getDb, members, type Member } from "@arf/db";
import type { VerifiedTelegramInitData } from "@arf/telegram";
import { getTelegramDisplayName } from "@arf/telegram";
import { isAdminTelegramId } from "@/lib/session";

export interface UpsertTelegramMemberInput {
  verifiedInitData: VerifiedTelegramInitData;
  groupStatus: "member" | "not_member" | "unknown";
}

export async function upsertTelegramMember({
  verifiedInitData,
  groupStatus,
}: UpsertTelegramMemberInput): Promise<Member> {
  const db = getDb();
  const telegramId = String(verifiedInitData.user.id);
  const isAdmin = isAdminTelegramId(telegramId);
  const profileValues = {
    telegramId,
    telegramUsername: verifiedInitData.user.username,
    telegramDisplayName: getTelegramDisplayName(verifiedInitData.user),
    telegramPhotoUrl: verifiedInitData.user.photo_url,
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
