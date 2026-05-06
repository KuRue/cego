export function utcToDateTimeLocal(utcDate: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  let hour = get("hour");
  if (hour === "24") hour = "00";

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function parseDateInTimezone(value: string, tz: string): Date {
  const naive = new Date(value);

  if (Number.isNaN(naive.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  const tzStr = naive.toLocaleString("en-US", { timeZone: tz });
  const tzDate = new Date(tzStr);
  const utcStr = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const utcDate = new Date(utcStr);
  const offsetMs = tzDate.getTime() - utcDate.getTime();

  return new Date(naive.getTime() - offsetMs);
}
