export function titleCase(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-lg px-2.5 py-1 text-xs font-semibold"
      style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    show: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    closed: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    draft: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    archived: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    pending_payment: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    confirmed: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    waitlisted: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    cancelled: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    expired: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
    pass: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    warn: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    fail: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
    submitted: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    pay_paid: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    pay_pending: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    pay_waived: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    pay_unpaid: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
  };

  const tone = map[status] ?? { bg: "var(--color-surface-hover)", text: "var(--color-muted)" };

  return (
    <span
      className="rounded-lg px-2.5 py-1 text-xs font-semibold"
      style={{ background: tone.bg, color: tone.text }}
    >
      {label ?? status}
    </span>
  );
}

/**
 * Unified status label for an event. Returns the same human-readable phrasing
 * everywhere the event status is shown (public landing, dashboard cards,
 * detail page, RSVP page, mobile pills). When the event is "show" status we
 * surface a live countdown to the next milestone (open / close / start);
 * otherwise we surface the literal status.
 *
 * Examples:
 *   "RSVP opens in 2 days 8 hours"
 *   "RSVP closes in 6 hours 30 minutes"
 *   "Event in 5 days"
 *   "RSVP closed"
 *   "Draft"
 */
export function eventStatusLabel(
  event: {
    status: string;
    startsAt?: Date | null;
    rsvpOpensAt?: Date | null;
    rsvpClosesAt?: Date | null;
  },
  // tz reserved for future locale-aware formatting; durations are tz-agnostic
  _tz?: string,
): string {
  switch (event.status) {
    case "draft":
      return "Draft";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    case "closed":
      return "RSVP closed";
  }

  if (event.status !== "show") return event.status;

  const now = Date.now();

  if (event.rsvpOpensAt && event.rsvpOpensAt.getTime() > now) {
    return `RSVP opens in ${formatCountdown(event.rsvpOpensAt.getTime() - now)}`;
  }

  if (event.rsvpClosesAt && event.rsvpClosesAt.getTime() > now) {
    return `RSVP closes in ${formatCountdown(event.rsvpClosesAt.getTime() - now)}`;
  }

  if (event.startsAt && event.startsAt.getTime() > now) {
    return `Event in ${formatCountdown(event.startsAt.getTime() - now)}`;
  }

  return "Past";
}

/**
 * Human-readable duration: "2 days 8 hours", "6 hours 30 minutes", "45 minutes".
 * Always rounds up to the nearest minute so a fresh countdown never reads "0 minutes".
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "soon";

  const totalMinutes = Math.ceil(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  // > 1 week — drop the hours, the precision isn't useful
  if (days >= 7) return plural(days, "day");

  // 1+ day — show days, optionally hours
  if (days >= 1) {
    return hours > 0
      ? `${plural(days, "day")} ${plural(hours, "hour")}`
      : plural(days, "day");
  }

  // < 1 day, 1+ hour — show hours, optionally minutes
  if (hours >= 1) {
    return minutes > 0
      ? `${plural(hours, "hour")} ${plural(minutes, "minute")}`
      : plural(hours, "hour");
  }

  // < 1 hour
  return plural(totalMinutes, "minute");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function rsvpStatusLabel(status: string): string {
  switch (status) {
    case "confirmed": return "RSVP Confirmed";
    case "waitlisted": return "On waitlist";
    case "cancelled": return "RSVP Cancelled";
    case "expired": return "RSVP Expired";
    default: return status;
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "paid": return "Payment Confirmed";
    case "pending": return "Payment Pending";
    case "waived": return "Payment Waived";
    case "unpaid": return "Payment Due";
    default: return status;
  }
}

export function TagBadge({ name, color }: { name: string; color: string }) {
  const tone = getTagTone(color);

  return (
    <span
      className="rounded-lg px-2.5 py-1 text-xs font-semibold"
      style={{ background: tone.bg, color: tone.text }}
    >
      {name}
    </span>
  );
}

export function getTagTone(color: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    green: { bg: "var(--color-tag-green-bg)", text: "var(--color-tag-green-text)" },
    gold: { bg: "var(--color-tag-gold-bg)", text: "var(--color-tag-gold-text)" },
    red: { bg: "var(--color-tag-red-bg)", text: "var(--color-tag-red-text)" },
    blue: { bg: "var(--color-tag-blue-bg)", text: "var(--color-tag-blue-text)" },
  };

  return map[color] ?? { bg: "var(--color-tag-gray-bg)", text: "var(--color-tag-gray-text)" };
}
