"use server";

import { revalidatePath } from "next/cache";
import { eq, getDb, members } from "@cego/db";
import { requireCurrentMember } from "@/lib/session";

export async function updateNotifyPrefsAction(formData: FormData) {
  const member = await requireCurrentMember();
  const db = getDb();

  const rsvpUpdates = formData.get("rsvpUpdates") === "on";
  const newEvents = formData.get("newEvents") === "on";

  await db
    .update(members)
    .set({
      notifyPrefs: { rsvpUpdates, newEvents },
      updatedAt: new Date(),
    })
    .where(eq(members.id, member.id));

  revalidatePath("/profile");
}
