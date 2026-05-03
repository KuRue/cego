import { getDb, siteSettings, type SiteSettings } from "@cego/db";

export interface BrandSettings {
  siteName: string;
  tagline: string;
  accentColor: string;
  accentColorDark: string;
  highlightColor: string;
  logoUrl: string | null;
  backgroundUrl: string | null;
  eventTypes: string[];
  heroTitle: string;
  heroBody: string;
  footerText: string;
}

const defaults: BrandSettings = {
  siteName: "cego",
  tagline: "Community Event Group Orchestrator",
  accentColor: "#183f3c",
  accentColorDark: "#5bbcb4",
  highlightColor: "#d8b35a",
  logoUrl: null,
  backgroundUrl: null,
  eventTypes: ["major_event", "local_event"],
  heroTitle: "Run community events without turning the group chat into a spreadsheet.",
  heroBody:
    "cego is the self-hosted planning surface for communities that need Telegram identity, capacity-aware RSVPs, built-in surveys, organizer review, and room to add cego-native payment steps when paid registration is ready.",
  footerText: "AGPLv3. Self-hosted.",
};

let cachedSettings: BrandSettings | null = null;

export async function getSiteSettings(): Promise<BrandSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const db = getDb();
    const rows = await db.select().from(siteSettings).limit(1);

    if (rows[0]) {
      cachedSettings = rowToSettings(rows[0]);
      return cachedSettings;
    }
  } catch {
    // Database might not be initialized yet
  }

  return defaults;
}

export function clearSettingsCache(): void {
  cachedSettings = null;
}

export async function getNavbarBrand(): Promise<{ siteName: string; logoUrl: string | null }> {
  const settings = await getSiteSettings();
  return { siteName: settings.siteName, logoUrl: settings.logoUrl };
}

function rowToSettings(row: SiteSettings): BrandSettings {
  return {
    siteName: row.siteName || defaults.siteName,
    tagline: row.tagline || defaults.tagline,
    accentColor: row.accentColor || defaults.accentColor,
    accentColorDark: row.accentColorDark || defaults.accentColorDark,
    highlightColor: row.highlightColor || defaults.highlightColor,
    logoUrl: stripQueryString(row.logoUrl),
    backgroundUrl: stripQueryString(row.backgroundUrl),
    eventTypes: parseEventTypes(row.eventTypes),
    heroTitle: row.heroTitle || defaults.heroTitle,
    heroBody: row.heroBody || defaults.heroBody,
    footerText: row.footerText || defaults.footerText,
  };
}

function parseEventTypes(value: string | null): string[] {
  if (!value) return defaults.eventTypes;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return defaults.eventTypes;
}

function stripQueryString(url: string | null): string | null {
  if (!url) return null;
  const qIndex = url.indexOf("?");
  return qIndex >= 0 ? url.slice(0, qIndex) : url;
}
