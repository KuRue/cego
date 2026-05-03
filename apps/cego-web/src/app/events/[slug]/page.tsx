import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, StatusBadge } from "@/components/badge";
import Navbar from "@/components/navbar";
import { cancelRsvpAction, rsvpForEventAction } from "@/lib/event-actions";
import { getDashboardEventBySlug, type EventWithRsvpState } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import { getNavbarBrand } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Details",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const brand = await getNavbarBrand();
  const member = await getCurrentMember();

  if (!member) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-3xl px-5 py-16">
          <div className="glass-lg rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Sign in to view this event</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Event details are available to Telegram-backed cego members.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in with Telegram
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (member.groupStatus !== "member") {
    return (
      <>
        <Navbar
          member={{
            telegramDisplayName: member.telegramDisplayName,
            telegramPhotoUrl: member.telegramPhotoUrl,
            isAdmin: member.isAdmin,
          }}
          brand={brand}
        />
        <main className="page-shell mx-auto max-w-3xl px-5 py-16">
          <div className="glass-lg rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Group access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              This event is only available to members of the configured Telegram group.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Refresh access
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { slug } = await params;
  const eventState = await getDashboardEventBySlug(member.id, slug);

  if (!eventState) {
    notFound();
  }

  return (
    <>
      <Navbar
        member={{
          telegramDisplayName: member.telegramDisplayName,
          telegramPhotoUrl: member.telegramPhotoUrl,
          isAdmin: member.isAdmin,
        }}
        brand={brand}
      />
      <EventDetail eventState={eventState} />
    </>
  );
}

function EventDetail({ eventState }: { eventState: EventWithRsvpState }) {
  const { event, confirmedCount, waitlistedCount, rsvp } = eventState;
  const returnTo = `/events/${event.slug}`;
  const isCancelableRsvp =
    rsvp?.status === "confirmed" || rsvp?.status === "waitlisted";
  const canRsvp =
    (event.status === "open" || event.status === "full") &&
    (!rsvp || rsvp.status === "cancelled");

  return (
    <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="mb-5">
        <Link
          href="/dashboard"
          className="text-sm font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          Back to dashboard
        </Link>
      </div>

      <section className="glass-lg overflow-hidden rounded-2xl">
        {event.imageUrl ? (
          <div className="relative h-64 sm:h-80">
            <Image src={event.imageUrl} alt="" fill className="object-cover" priority />
          </div>
        ) : null}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge>{event.type === "major_event" ? "Major event" : "Local event"}</Badge>
            <StatusBadge status={event.status} />
            {rsvp ? <StatusBadge status={rsvp.status} /> : null}
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight">
            {event.title}
          </h1>
          {event.description ? (
            <p className="mt-4 max-w-3xl text-base leading-8" style={{ color: "var(--color-muted)" }}>
              {event.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Panel title="Event Details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Date" value={formatDateRange(event.startsAt, event.endsAt)} />
              <Detail label="Location" value={event.locationText ?? "Location to be announced"} />
              <Detail
                label="Capacity"
                value={`${confirmedCount}/${event.capacity} confirmed${
                  waitlistedCount > 0 ? `; ${waitlistedCount} waitlisted` : ""
                }`}
              />
              <Detail
                label="Price"
                value={
                  event.priceCents !== null
                    ? formatPrice(event.priceCents, event.currency)
                    : event.paymentRequired
                      ? "Payment required"
                      : "Free"
                }
              />
            </dl>
          </Panel>

          {event.rulesText || event.termsText || event.refundPolicyText ? (
            <Panel title="Policies">
              <div className="grid gap-4">
                {event.rulesText ? <TextBlock title="Rules" body={event.rulesText} /> : null}
                {event.termsText ? <TextBlock title="Terms" body={event.termsText} /> : null}
                {event.refundPolicyText ? (
                  <TextBlock title="Cancellation/refund policy" body={event.refundPolicyText} />
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="glass-lg h-fit rounded-2xl p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Registration</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
            RSVPs confirm until capacity is reached. After that, members are waitlisted.
          </p>

          <div className="mt-5 grid gap-3">
            {canRsvp ? (
              <form action={rsvpForEventAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-xl px-5 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  RSVP
                </button>
              </form>
            ) : null}

            {isCancelableRsvp ? (
              <form action={cancelRsvpAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-xl px-5 text-sm font-semibold transition"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                >
                  Cancel RSVP
                </button>
              </form>
            ) : null}

            {!canRsvp && !isCancelableRsvp ? (
              <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--color-surface-hover)" }}>
                {event.status === "closed"
                  ? "This event is closed."
                  : "Your RSVP is recorded."}
              </p>
            ) : null}
          </div>

          {rsvp ? (
            <div className="mt-5 rounded-xl p-4" style={{ border: "1px solid var(--color-surface-border)" }}>
              <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                Current status
              </p>
              <p className="mt-2 font-semibold">{rsvp.status}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="glass-lg rounded-2xl p-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
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

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--color-muted)" }}>
        {body}
      </p>
    </section>
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
