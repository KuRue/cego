export function formatDateRange(startsAt: Date, endsAt: Date | null, tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });

  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

export function formatDateRangeShort(startsAt: Date, endsAt: Date | null, tz: string): string {
  const monthDay = { month: "short", day: "numeric" } as const;
  const full = { month: "short", day: "numeric", year: "numeric" } as const;

  if (!endsAt) {
    return new Intl.DateTimeFormat("en-US", { ...full, timeZone: tz }).format(startsAt);
  }

  const sParts = getDateParts(startsAt, tz);
  const eParts = getDateParts(endsAt, tz);

  if (sParts.year === eParts.year && sParts.month === eParts.month) {
    const m = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: tz }).format(startsAt);
    return `${m} ${sParts.day}-${eParts.day}, ${sParts.year}`;
  }

  if (sParts.year === eParts.year) {
    const fmt = new Intl.DateTimeFormat("en-US", { ...monthDay, timeZone: tz });
    return `${fmt.format(startsAt)} - ${fmt.format(endsAt)}, ${sParts.year}`;
  }

  const fmt = new Intl.DateTimeFormat("en-US", { ...full, timeZone: tz });
  return `${fmt.format(startsAt)} - ${fmt.format(endsAt)}`;
}

export function formatDateLines(startsAt: Date, endsAt: Date | null, tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });

  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)}\nto ${formatter.format(endsAt)}`;
}

export function formatDateOnly(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(date);
}

export function formatDateWithTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
}

export function formatDateShort(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
}

export function formatShortDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(date);
}

export function formatRsvpOpenDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(date);
}

function getDateParts(date: Date, tz: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: tz,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
