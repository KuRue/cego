"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, getDb, members } from "@cego/db";
import { requireCurrentMember } from "@/lib/session";

export async function updateCurrentMemberEmailAction(formData: FormData) {
  const member = await requireCurrentMember();
  const db = getDb();

  await db
    .update(members)
    .set({
      email: normalizeEmail(readText(formData, "email")),
      updatedAt: new Date(),
    })
    .where(eq(members.id, member.id));

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect("/dashboard");
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string | null {
  return value ? value.toLowerCase() : null;
}
