"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, getDb, siteSettings } from "@cego/db";
import { requireAdminMember } from "@/lib/session";
import { audit } from "@/lib/audit";
import { clearSettingsCache, normalizeBrandColor, normalizeTimezone } from "@/lib/settings";

export async function updateSiteSettingsAction(formData: FormData) {
  const admin = await requireAdminMember();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin#settings";

  const db = getDb();
  const values = {
    siteName: readText(formData, "siteName") || "cego",
    tagline: readText(formData, "tagline") || "Community Event Group Orchestrator",
    accentColor: readColor(formData, "accentColor", "#183f3c"),
    accentColorDark: readColor(formData, "accentColorDark", "#5bbcb4"),
    highlightColor: readColor(formData, "highlightColor", "#d8b35a"),
    logoUrl: readText(formData, "logoUrl") || null,
    wordmarkUrl: readText(formData, "wordmarkUrl") || null,
    backgroundUrl: readText(formData, "backgroundUrl") || null,
    heroTitle: readText(formData, "heroTitle") || "",
    heroBody: readText(formData, "heroBody") || "",
    footerText: readText(formData, "footerText") || "",
    eventTypes: readEventTypes(formData, "eventTypes"),
    timezone: normalizeTimezone(readText(formData, "timezone")),
    updatedAt: new Date(),
  };

  const existing = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);

  if (existing[0]) {
    await db.update(siteSettings).set(values).where(eq(siteSettings.id, existing[0].id));
  } else {
    await db.insert(siteSettings).values(values);
  }

  clearSettingsCache();

  audit({
    actorId: admin.id,
    action: "site_settings_updated",
  }).catch(() => {});

  revalidatePath("/", "layout");
  revalidatePath("/admin");
  redirect(returnTo);
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readColor(formData: FormData, key: string, fallback: string): string {
  return normalizeBrandColor(readText(formData, key), fallback);
}

function readReturnPath(formData: FormData, key: string): string | null {
  const value = readText(formData, key);

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function readEventTypes(formData: FormData, key: string): string {
  const value = readText(formData, key);
  if (!value) return '["retreat","meet"]';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return JSON.stringify(parsed.filter((t: unknown) => typeof t === "string" && t.trim()));
    }
  } catch {}
  return '["retreat","meet"]';
}
