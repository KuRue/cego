import Image from "next/image";
import type { ReactNode } from "react";
import { Badge, StatusBadge, titleCase } from "@/components/badge";
import type { Event } from "@cego/db";

/**
 * Shared event card layout used on the public landing and the dashboard.
 *
 * Mobile (< md): image fills card top with a gradient overlay; title, date,
 *                and location sit ON the image. The rest (description,
 *                capacity, price, action button) flows below.
 * Desktop (md+): horizontal split — image on the left, full text block on the right.
 *
 * Pass `extraBadges` for RSVP-status badges, `extraDetails` for price-style
 * data points beyond the built-ins, and `actions` for the bottom button area.
 */
export type EventCardProps = {
  event: Pick<
    Event,
    | "id"
    | "title"
    | "slug"
    | "description"
    | "type"
    | "status"
    | "startsAt"
    | "endsAt"
    | "locationText"
    | "capacity"
    | "imageUrl"
  >;
  confirmedCount: number;
  waitlistedCount: number;
  extraBadges?: ReactNode;
  extraDetails?: ReactNode;
  actions: ReactNode;
  /** Visible on the right side of the price/capacity grid on desktop, hidden inside image overlay slot if you choose. */
  showFull?: boolean;
};

export function EventCard({
  event,
  confirmedCount,
  waitlistedCount,
  extraBadges,
  extraDetails,
  actions,
  showFull = false,
}: EventCardProps) {
  const hasImage = !!event.imageUrl;

  const badgeRow = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{titleCase(event.type)}</Badge>
      <StatusBadge status={event.status} />
      {extraBadges}
      {showFull ? (
        <span
          className="rounded-lg px-2.5 py-0.5 text-xs font-medium"
          style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
        >
          Full
        </span>
      ) : null}
    </div>
  );

  return (
    <article className="glass-lg glass-hover overflow-hidden rounded-2xl transition">
      <div className="flex flex-col md:flex-row">
        {/* Image side (or placeholder) */}
        {hasImage ? (
          <div className="relative h-64 w-full overflow-hidden sm:h-72 md:h-auto md:w-72 lg:w-80">
            <Image
              src={event.imageUrl as string}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, 100vw"
            />

            {/* Mobile-only overlay: gradient + title/date/location ON the image */}
            <div className="absolute inset-x-0 bottom-0 md:hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/90 via-black/60 to-transparent"
              />
              <div
                className="relative px-4 pb-4 pt-10 text-white"
                style={{ textShadow: "0 1px 4px rgba(0, 0, 0, 0.55)" }}
              >
                {badgeRow}
                <h3 className="mt-2 text-xl font-semibold leading-tight">{event.title}</h3>
                <p className="mt-1 text-sm opacity-95">
                  {formatDateRange(event.startsAt, event.endsAt)}
                </p>
                {event.locationText ? (
                  <p className="text-sm opacity-95">{event.locationText}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="hidden md:flex md:w-40 md:items-center md:justify-center lg:w-48"
            style={{ background: "var(--color-surface-hover)" }}
          >
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              {event.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Text + actions side */}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            {/* Title block: shown on desktop always, and on mobile only when there's no image overlay */}
            <div className={hasImage ? "hidden md:block" : ""}>
              {badgeRow}
              <h3 className="mt-3 text-xl font-semibold">{event.title}</h3>
            </div>

            {event.description ? (
              <p
                className={`text-sm leading-6 ${hasImage ? "mt-0 md:mt-3" : "mt-3"}`}
                style={{ color: "var(--color-muted)" }}
              >
                {event.description.length > 220
                  ? `${event.description.slice(0, 220)}…`
                  : event.description}
              </p>
            ) : null}

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {/* Date + location duplicated in the text block on desktop; hidden on mobile when image overlay shows them */}
              <div className={hasImage ? "hidden md:block" : ""}>
                <Detail label="Date" value={formatDateRange(event.startsAt, event.endsAt)} />
              </div>
              {event.locationText ? (
                <div className={hasImage ? "hidden md:block" : ""}>
                  <Detail label="Location" value={event.locationText} />
                </div>
              ) : null}
              <Detail
                label="Capacity"
                value={`${confirmedCount}/${event.capacity} filled${
                  waitlistedCount > 0 ? `; ${waitlistedCount} waitlisted` : ""
                }`}
              />
              {extraDetails}
            </dl>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">{actions}</div>
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
        {label}
      </dt>
      <dd className="mt-1 leading-6">{value}</dd>
    </div>
  );
}

function formatDateRange(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endsAt) {
    return formatter.format(startsAt);
  }

  return `${formatter.format(startsAt)} – ${formatter.format(endsAt)}`;
}
