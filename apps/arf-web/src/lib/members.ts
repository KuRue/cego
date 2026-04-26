import { getDb, members, type Member } from "@arf/db";
import type { VerifiedTelegramInitData } from "@arf/telegram";
import { getTelegramDisplayName } from "@arf/telegram";

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

  const inserted = await db
    .insert(members)
    .values({
      telegramId,
      telegramUsername: verifiedInitData.user.username,
      telegramDisplayName: getTelegramDisplayName(verifiedInitData.user),
      telegramPhotoUrl: verifiedInitData.user.photo_url,
      groupStatus,
    })
    .onConflictDoUpdate({
      target: members.telegramId,
      set: {
        telegramUsername: verifiedInitData.user.username,
        telegramDisplayName: getTelegramDisplayName(verifiedInitData.user),
        telegramPhotoUrl: verifiedInitData.user.photo_url,
        groupStatus,
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
