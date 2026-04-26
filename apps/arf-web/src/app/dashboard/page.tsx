import Link from "next/link";
import { cancelRsvpAction, rsvpForEventAction } from "@/lib/event-actions";
import { getDashboardEvents, type EventWithRsvpState } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member Dashboard",
};

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <DashboardShell>
        <EmptyState
          title="Sign in through Telegram to see ARF events."
          body="ARF uses Telegram Mini App identity instead of password accounts. Open the Mini App shell to create your session."
          action={<PrimaryLink href="/mini-app">Open Mini App</PrimaryLink>}
        />
      </DashboardShell>
    );
  }

  if (member.groupStatus !== "member") {
    return (
      <DashboardShell memberName={member.telegramDisplayName}>
        <EmptyState
          title="Telegram group access is required."
          body="This account is signed in, but ARF event flows are only open to members of the configured Telegram group."
          action={<PrimaryLink href="/mini-app">Check Telegram access</PrimaryLink>}
        />
      </DashboardShell>
    );
  }

  const eventStates = await getDashboardEvents(member.id);
  const confirmedCount = eventStates.filter(
    ({ rsvp }) => rsvp?.status === "confirmed",
  ).length;
  const waitlistedCount = eventStates.filter(
    ({ rsvp }) => rsvp?.status === "waitlisted",
  ).length;

  return (
    <DashboardShell memberName={member.telegramDisplayName}>
      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Active events" value={String(eventStates.length)} />
        <StatusCard label="Confirmed RSVPs" value={String(confirmedCount)} />
        <StatusCard label="Waitlisted" value={String(waitlistedCount)} />
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
              Events
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Retreat RSVPs</h2>
          </div>
          {member.isAdmin ? (
            <Link href="/admin" className="text-sm font-semibold text-[#183f3c]">
              Organizer admin
            </Link>
          ) : null}
        </div>

        {eventStates.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No open ARF events yet."
              body="Once organizers publish an annual retreat or mini retreat, it will appear here with RSVP status and capacity."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {eventStates.map((eventState) => (
              <EventCard key={eventState.event.id} eventState={eventState} />
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function DashboardShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#1d2523]">
      <header className="border-b border-[#d7e3df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-semibold text-[#183f3c]">
            ARF
          </Link>
          <div className="flex items-center gap-4 text-sm text-[#4e5b57]">
            {memberName ? <span>{memberName}</span> : null}
            <Link href="/mini-app">Mini App</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
          Member dashboard
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
          RSVP for annual retreats and local mini retreats.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#4e5b57]">
          Confirmed spots count against event capacity. Once capacity is full,
          new RSVPs move to the manual waitlist.
        </p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function EventCard({ eventState }: { eventState: EventWithRsvpState }) {
  const { event, confirmedCount, waitlistedCount, rsvp } = eventState;
  const isActiveRsvp =
    rsvp?.status === "confirmed" || rsvp?.status === "waitlisted";
  const canRsvp =
    (event.status === "open" || event.status === "full") &&
    (!rsvp || rsvp.status === "cancelled");

  return (
    <article className="border border-[#d7e3df] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{event.type === "annual_retreat" ? "Annual" : "Mini"}</Badge>
            <Badge tone={event.status === "closed" ? "muted" : "active"}>
              {event.status}
            </Badge>
            {rsvp ? <Badge tone="rsvp">{rsvp.status}</Badge> : null}
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-[#14211f]">
            {event.title}
          </h3>
          <p className="mt-2 text-sm text-[#4e5b57]">
            {formatDateRange(event.startsAt, event.endsAt)}
          </p>
          {event.locationText ? (
            <p className="mt-2 text-sm text-[#4e5b57]">{event.locationText}</p>
          ) : null}
        </div>

        <div className="grid min-w-48 grid-cols-2 gap-3 text-sm">
          <Metric label="Confirmed" value={`${confirmedCount}/${event.capacity}`} />
          <Metric label="Waitlist" value={String(waitlistedCount)} />
        </div>
      </div>

      <div className="mt-5 border-t border-[#e3ece9] pt-5">
        {canRsvp ? (
          <form action={rsvpForEventAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white transition hover:bg-[#245b55] sm:w-auto"
            >
              RSVP
            </button>
          </form>
        ) : null}

        {isActiveRsvp ? (
          <form action={cancelRsvpAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#b8cac5] px-5 text-sm font-semibold text-[#183f3c] transition hover:border-[#183f3c] sm:w-auto"
            >
              Cancel RSVP
            </button>
          </form>
        ) : null}

        {!canRsvp && !isActiveRsvp ? (
          <p className="text-sm text-[#64706c]">
            {event.status === "closed"
              ? "This event is closed to new RSVPs."
              : "Your RSVP state is already recorded."}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-[#d7e3df] bg-white p-6">
      <h2 className="text-2xl font-semibold text-[#14211f]">{title}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-[#4e5b57]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white transition hover:bg-[#245b55]"
    >
      {children}
    </Link>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#d7e3df] bg-white p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[#6b746f]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[#183f3c]">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e3ece9] bg-[#f8fbff] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-[#6b746f]">
        {label}
      </p>
      <p className="mt-2 font-semibold text-[#183f3c]">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "active" | "muted" | "rsvp";
}) {
  const className =
    tone === "active"
      ? "bg-[#dbe9e5] text-[#183f3c]"
      : tone === "rsvp"
        ? "bg-[#f7e9c0] text-[#6b4c00]"
        : "bg-[#eef3f1] text-[#4e5b57]";

  return (
    <span className={`rounded-md px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
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
