"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, getDb, members } from "@cego/db";
import { requireCurrentMember } from "@/lib/session";

export async function updateCurrentMemberEmailAction(formData: FormData) {
  const member = await requireCurrentMember();
  const db = getDb();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";

  await db
    .update(members)
    .set({
      email: normalizeEmail(readText(formData, "email")),
      updatedAt: new Date(),
    })
    .where(eq(members.id, member.id));

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect(returnTo);
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string | null {
  return value ? value.toLowerCase() : null;
}

function readReturnPath(formData: FormData, key: string): string | null {
  const value = readText(formData, key);

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}
