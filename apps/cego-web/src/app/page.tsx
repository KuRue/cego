import Image from "next/image";
import Script from "next/script";
import AppLink from "@/components/app-link";
import Navbar from "@/components/navbar";
import { Badge, StatusBadge } from "@/components/badge";
import { getSiteSettings } from "@/lib/settings";
import { getPublicEvents } from "@/lib/events";
import TelegramMiniAppRedirect from "./telegram-mini-app-redirect";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSiteSettings();
  const { upcoming, past } = await getPublicEvents();

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TelegramMiniAppRedirect />
      <Navbar brand={{ siteName: settings.siteName, logoUrl: settings.logoUrl }} />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pt-12">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {settings.heroTitle}
            </h1>
            {settings.heroBody ? (
              <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--color-muted)" }}>
                {settings.heroBody}
              </p>
            ) : null}
          </div>
          <AppLink
            href="/sign-in"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
          >
            Sign in for details
          </AppLink>
        </section>

        {upcoming.length === 0 && past.length === 0 ? (
          <div className="glass-lg mt-4 rounded-2xl p-10 text-center">
            <p className="text-lg font-medium">No events posted yet</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Check back soon or sign in to stay updated.
            </p>
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>
              Upcoming
            </h2>
            <div className="mt-4 grid gap-6">
              {upcoming.map((entry) => (
                <PublicEventCard key={entry.event.id} {...entry} />
              ))}
            </div>
          </section>
        ) : null}

        {past.length > 0 ? (
          <section className={upcoming.length > 0 ? "mt-12" : ""}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>
              Past events
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((entry) => (
                <PastEventCard key={entry.event.id} {...entry} />
              ))}
            </div>
          </section>
        ) : null}

        <footer
          className="mt-16 flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--color-surface-border)", color: "var(--color-muted)" }}
        >
          <span>{settings.footerText}</span>
          <a href="https://github.com/KuRue/cego" rel="noreferrer">
            Source code
          </a>
        </footer>
      </main>
    </>
  );
}

function PublicEventCard({ event, confirmedCount, waitlistedCount }: { event: import("@cego/db").Event; confirmedCount: number; waitlistedCount: number }) {
  const spotsLeft = event.capacity - confirmedCount;
  const isFull = spotsLeft <= 0;

  return (
    <article className="glass-lg glass-hover overflow-hidden rounded-2xl transition">
      <div className="flex flex-col md:flex-row">
        {event.imageUrl ? (
          <div className="relative md:w-72 lg:w-80">
            <Image
              src={event.imageUrl}
              alt=""
              fill
              className="h-48 w-full object-cover md:h-full"
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center md:w-40 lg:w-48"
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
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{event.type === "major_event" ? "Major" : "Local"}</Badge>
              <StatusBadge status={event.status} />
              {isFull ? (
                <span
                  className="rounded-lg px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                >
                  Full
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-xl font-semibold">{event.title}</h3>
            {event.description ? (
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
                {event.description.length > 200
                  ? `${event.description.slice(0, 200)}...`
                  : event.description}
              </p>
            ) : null}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                  Date
                </dt>
                <dd className="mt-1 leading-6">{formatDateRange(event.startsAt, event.endsAt)}</dd>
              </div>
              {event.locationText ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                    Location
                  </dt>
                  <dd className="mt-1 leading-6">{event.locationText}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                  Capacity
                </dt>
                <dd className="mt-1 leading-6">
                  {confirmedCount}/{event.capacity} filled
                  {waitlistedCount > 0 ? `; ${waitlistedCount} waitlisted` : ""}
                </dd>
              </div>
              {event.priceCents !== null ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                    Price
                  </dt>
                  <dd className="mt-1 leading-6">{formatPrice(event.priceCents, event.currency)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="mt-4">
            <AppLink
              href="/sign-in"
              className="inline-flex h-9 items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in to {isFull ? "join waitlist" : "RSVP"}
            </AppLink>
          </div>
        </div>
      </div>
    </article>
  );
}

function PastEventCard({ event, confirmedCount }: { event: import("@cego/db").Event; confirmedCount: number }) {
  return (
    <article className="glass glass-hover rounded-2xl p-4 transition">
      <div className="flex items-start gap-3">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-sm font-bold"
            style={{ background: "var(--color-surface-hover)", color: "var(--color-muted)" }}
          >
            {event.title.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{event.title}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {formatDateRange(event.startsAt, event.endsAt)}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
            {confirmedCount} attended
          </p>
        </div>
      </div>
    </article>
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

  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
