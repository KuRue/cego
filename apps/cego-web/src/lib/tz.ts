export function utcToDateTimeLocal(utcDate: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcDate);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseDateInTimezone(value: string, tz: string): Date {
  const parts = parseDateTimeLocal(value);

  if (!parts) {
    throw new Error(`Invalid date: ${value}`);
  }

  const wallTimeAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
  const wallTimeAsUtc = new Date(wallTimeAsUtcMs);

  if (
    wallTimeAsUtc.getUTCFullYear() !== parts.year ||
    wallTimeAsUtc.getUTCMonth() !== parts.month - 1 ||
    wallTimeAsUtc.getUTCDate() !== parts.day ||
    wallTimeAsUtc.getUTCHours() !== parts.hour ||
    wallTimeAsUtc.getUTCMinutes() !== parts.minute ||
    wallTimeAsUtc.getUTCSeconds() !== parts.second
  ) {
    throw new Error(`Invalid date: ${value}`);
  }

  let utcMs = wallTimeAsUtcMs - getTimezoneOffsetMs(wallTimeAsUtc, tz);
  utcMs = wallTimeAsUtcMs - getTimezoneOffsetMs(new Date(utcMs), tz);

  return new Date(utcMs);
}

function parseDateTimeLocal(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "0", fraction = "0"] = match;
  const parsed = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.padEnd(3, "0")),
  };

  if (
    parsed.month < 1 ||
    parsed.month > 12 ||
    parsed.day < 1 ||
    parsed.day > 31 ||
    parsed.hour > 23 ||
    parsed.minute > 59 ||
    parsed.second > 59
  ) {
    return null;
  }

  return parsed;
}

function getTimezoneOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return asUtcMs - (date.getTime() - date.getMilliseconds());
}
