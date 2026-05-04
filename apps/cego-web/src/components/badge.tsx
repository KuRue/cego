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
    open: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    full: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    closed: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    draft: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    archived: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    confirmed: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    waitlisted: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    cancelled: { bg: "var(--color-surface-hover)", text: "var(--color-muted)" },
    pass: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
    warn: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
    fail: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
    submitted: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
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

export function eventStatusLabel(
  status: string,
  startsAt?: Date | null,
  rsvpOpensAt?: Date | null,
): string {
  const now = Date.now();

  switch (status) {
    case "open":
    case "full":
      return "Accepting RSVPs";
    case "closed":
      return "RSVPs closed";
    case "draft": {
      if (rsvpOpensAt && rsvpOpensAt.getTime() > now) {
        const date = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(rsvpOpensAt);
        return `RSVPs open ${date}`;
      }
      return "Coming soon";
    }
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function rsvpStatusLabel(status: string): string {
  switch (status) {
    case "confirmed": return "RSVP confirmed";
    case "waitlisted": return "On waitlist";
    case "cancelled": return "RSVP cancelled";
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
