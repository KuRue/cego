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
  timezone: string;
}

export const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "America/Sao_Paulo", label: "Sao Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India" },
  { value: "Asia/Bangkok", label: "Bangkok" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
] as const;

const timezoneAliases: Record<string, string> = {
  ET: "America/New_York",
  EST: "America/New_York",
  EDT: "America/New_York",
  "US/Eastern": "America/New_York",
};

export const defaults: BrandSettings = {
  siteName: "cego",
  tagline: "Community Event Group Orchestrator",
  accentColor: "#183f3c",
  accentColorDark: "#5bbcb4",
  highlightColor: "#d8b35a",
  logoUrl: null,
  backgroundUrl: null,
  eventTypes: ["retreat", "meet"],
  heroTitle: "Run community events without turning the group chat into a spreadsheet.",
  heroBody:
    "cego is the self-hosted planning surface for communities that need Telegram identity, capacity-aware RSVPs, built-in surveys, organizer review, and room to add cego-native payment steps when paid registration is ready.",
  footerText: "AGPLv3. Self-hosted.",
  timezone: timezoneOptions[0].value,
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

export async function getNavbarBrand(): Promise<{ siteName: string; logoUrl: string | null; backgroundUrl: string | null }> {
  const settings = await getSiteSettings();
  return { siteName: settings.siteName, logoUrl: settings.logoUrl, backgroundUrl: settings.backgroundUrl };
}

export function normalizeTimezone(value: string | null | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaults.timezone;
  }

  const normalized = timezoneAliases[trimmed] ?? trimmed;

  if (timezoneOptions.some((option) => option.value === normalized)) {
    return normalized;
  }

  return defaults.timezone;
}

export function normalizeBrandColor(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();

  if (trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function rowToSettings(row: SiteSettings): BrandSettings {
  return {
    siteName: row.siteName || defaults.siteName,
    tagline: row.tagline || defaults.tagline,
    accentColor: normalizeBrandColor(row.accentColor, defaults.accentColor),
    accentColorDark: normalizeBrandColor(row.accentColorDark, defaults.accentColorDark),
    highlightColor: normalizeBrandColor(row.highlightColor, defaults.highlightColor),
    logoUrl: stripQueryString(row.logoUrl),
    backgroundUrl: stripQueryString(row.backgroundUrl),
    eventTypes: parseEventTypes(row.eventTypes),
    heroTitle: row.heroTitle || defaults.heroTitle,
    heroBody: row.heroBody || defaults.heroBody,
    footerText: row.footerText || defaults.footerText,
    timezone: normalizeTimezone(row.timezone),
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
