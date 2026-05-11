"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/app-link";

interface RsvpOpensCountdownProps {
  /** When RSVPs open, as milliseconds since epoch. */
  rsvpOpensAtMs: number;
  /** Event slug for the RSVP link target once the countdown hits zero. */
  slug: string;
}

/**
 * Renders a live ticking countdown to when RSVPs open. The instant the timer
 * hits zero the panel swaps to a "Start RSVP" button — no page refresh needed.
 *
 * Server-side gating still prevents early RSVPs: rsvpForEventAction calls
 * getEffectiveRsvpStatus() which rejects anything before rsvpOpensAt. The
 * client clock can drift slightly; if a user clicks before the server agrees
 * the RSVP submission will redirect with rsvp_error and they can retry.
 *
 * Uses a "mounted" pattern to avoid hydration mismatch — the server cannot
 * predict the client's Date.now(), so the initial render is a static
 * placeholder that the client immediately replaces with the live value.
 */
export default function RsvpOpensCountdown({ rsvpOpensAtMs, slug }: RsvpOpensCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pre-hydration placeholder — keeps the panel from jumping in size when the
  // live countdown swaps in.
  if (now === null) {
    return (
      <div
        className="rounded-xl px-4 py-4 text-center"
        style={{ background: "var(--color-surface-hover)" }}
      >
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
          RSVP opens in
        </p>
        <p className="mt-1 text-base font-semibold">&nbsp;</p>
      </div>
    );
  }

  const remaining = rsvpOpensAtMs - now;

  // Timer hit zero — RSVP is open, swap to the action button.
  if (remaining <= 0) {
    return (
      <AppLink
        href={`/events/${slug}/rsvp`}
        className="flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        Start RSVP
      </AppLink>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-4 text-center"
      style={{ background: "var(--color-surface-hover)" }}
    >
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
        RSVP opens in
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums">
        {formatLiveCountdown(remaining)}
      </p>
    </div>
  );
}

/**
 * Live countdown formatting — includes seconds once we're under an hour so
 * the user sees real progress as it ticks. Mirrors badge.tsx's formatCountdown
 * for the longer ranges so the wording stays consistent across the site.
 */
function formatLiveCountdown(ms: number): string {
  // Round UP to the next second so we never display "0 seconds" before the swap.
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 7) return plural(days, "day");

  if (days >= 1) {
    return hours > 0
      ? `${plural(days, "day")} ${plural(hours, "hour")}`
      : plural(days, "day");
  }

  if (hours >= 1) {
    return minutes > 0
      ? `${plural(hours, "hour")} ${plural(minutes, "minute")}`
      : plural(hours, "hour");
  }

  if (minutes >= 1) {
    return seconds > 0
      ? `${plural(minutes, "minute")} ${plural(seconds, "second")}`
      : plural(minutes, "minute");
  }

  return plural(seconds, "second");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}
