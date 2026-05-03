"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, getDb, siteSettings } from "@cego/db";
import { requireAdminMember } from "@/lib/session";
import { clearSettingsCache } from "@/lib/settings";

export async function updateSiteSettingsAction(formData: FormData) {
  await requireAdminMember();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin#settings";

  const db = getDb();
  const values = {
    siteName: readText(formData, "siteName") || "cego",
    tagline: readText(formData, "tagline") || "Community Event Group Orchestrator",
    accentColor: readColor(formData, "accentColor", "#183f3c"),
    accentColorDark: readColor(formData, "accentColorDark", "#5bbcb4"),
    highlightColor: readColor(formData, "highlightColor", "#d8b35a"),
    logoUrl: readText(formData, "logoUrl") || null,
    heroTitle: readText(formData, "heroTitle") || "",
    heroBody: readText(formData, "heroBody") || "",
    footerText: readText(formData, "footerText") || "",
    updatedAt: new Date(),
  };

  const existing = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);

  if (existing[0]) {
    await db.update(siteSettings).set(values).where(eq(siteSettings.id, existing[0].id));
  } else {
    await db.insert(siteSettings).values(values);
  }

  clearSettingsCache();
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  redirect(returnTo);
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readColor(formData: FormData, key: string, fallback: string): string {
  const value = readText(formData, key);
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return fallback;
}

function readReturnPath(formData: FormData, key: string): string | null {
  const value = readText(formData, key);

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}
