import Link from "next/link";
import {
  createEventAction,
  updateEventAction,
  updateRsvpStatusAction,
} from "@/lib/event-actions";
import { getAdminEvents, type AdminEventWithRsvps } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organizer Admin",
};

export default async function AdminPage() {
  const member = await getCurrentMember();

  if (!member || !member.isAdmin) {
    return (
      <AdminShell>
        <div className="border border-white/15 bg-white/5 p-6">
          <h1 className="text-3xl font-semibold">Organizer access required.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/70">
            Sign in through Telegram with an admin-listed Telegram ID to manage
            events, capacity, and RSVP state.
          </p>
          <Link
            href="/mini-app"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#14211f]"
          >
            Open Mini App
          </Link>
        </div>
      </AdminShell>
    );
  }

  const eventOverviews = await getAdminEvents();

  return (
    <AdminShell memberName={member.telegramDisplayName}>
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <CreateEventPanel />
        <div className="border border-white/15 bg-white/5 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Events
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {eventOverviews.length} event{eventOverviews.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-3 leading-7 text-white/70">
            Draft and archived events stay hidden from members. Open, full, and
            closed events appear on the member dashboard according to RSVP rules.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5">
        {eventOverviews.length === 0 ? (
          <div className="border border-white/15 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">No events yet.</h2>
            <p className="mt-3 text-white/70">
              Create the first annual retreat or mini retreat to start testing
              RSVP behavior.
            </p>
          </div>
        ) : (
          eventOverviews.map((overview) => (
            <AdminEventCard key={overview.event.id} overview={overview} />
          ))
        )}
      </section>
    </AdminShell>
  );
}

function AdminShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#14211f] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold">
            ARF
          </Link>
          <div className="flex items-center gap-4 text-sm text-white/70">
            {memberName ? <span>{memberName}</span> : null}
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div className="mt-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Organizer admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Manage events, capacity, waitlists, and RSVP state.
          </h1>
        </div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function CreateEventPanel() {
  return (
    <div className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <h2 className="text-2xl font-semibold">Create event</h2>
      <EventForm action={createEventAction} submitLabel="Create event" />
    </div>
  );
}

function AdminEventCard({ overview }: { overview: AdminEventWithRsvps }) {
  const { event, confirmedCount, waitlistedCount, rsvps } = overview;

  return (
    <article className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{event.type === "annual_retreat" ? "Annual" : "Mini"}</Badge>
            <Badge>{event.status}</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{event.title}</h2>
          <p className="mt-2 text-sm text-[#4e5b57]">
            {formatDateRange(event.startsAt, event.endsAt)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Confirmed" value={`${confirmedCount}/${event.capacity}`} />
            <Metric label="Waitlist" value={String(waitlistedCount)} />
          </div>
        </div>

        <div className="border border-[#d7e3df] bg-[#f8fbff] p-4">
          <h3 className="font-semibold">Edit event</h3>
          <EventForm
            action={updateEventAction}
            submitLabel="Save event"
            event={event}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-[#e3ece9] pt-5">
        <h3 className="font-semibold">RSVPs</h3>
        {rsvps.length === 0 ? (
          <p className="mt-3 text-sm text-[#64706c]">No RSVPs yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {rsvps.map(({ rsvp, member }) => (
              <form
                key={rsvp.id}
                action={updateRsvpStatusAction}
                className="grid gap-3 border border-[#d7e3df] p-4 md:grid-cols-[1fr_auto_auto]"
              >
                <input type="hidden" name="rsvpId" value={rsvp.id} />
                <div>
                  <p className="font-medium">{member.telegramDisplayName}</p>
                  <p className="mt-1 text-sm text-[#64706c]">
                    {member.telegramUsername
                      ? `@${member.telegramUsername}`
                      : member.email || member.groupStatus}
                  </p>
                </div>
                <select
                  name="status"
                  defaultValue={rsvp.status}
                  className="h-10 rounded-md border border-[#b8cac5] bg-white px-3 text-sm"
                >
                  <option value="confirmed">confirmed</option>
                  <option value="waitlisted">waitlisted</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
                >
                  Update
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function EventForm({
  action,
  submitLabel,
  event,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  event?: AdminEventWithRsvps["event"];
}) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            name="type"
            defaultValue={event?.type ?? "mini_retreat"}
            className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
          >
            <option value="annual_retreat">annual_retreat</option>
            <option value="mini_retreat">mini_retreat</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            name="status"
            defaultValue={event?.status ?? "draft"}
            className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
          >
            <option value="draft">draft</option>
            <option value="open">open</option>
            <option value="full">full</option>
            <option value="closed">closed</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Title</span>
        <input
          name="title"
          required
          defaultValue={event?.title}
          className="h-10 rounded-md border border-[#b8cac5] px-3"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Slug</span>
          <input
            name="slug"
            required
            defaultValue={event?.slug}
            className="h-10 rounded-md border border-[#b8cac5] px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Capacity</span>
          <input
            name="capacity"
            required
            type="number"
            min="1"
            defaultValue={event?.capacity ?? 12}
            className="h-10 rounded-md border border-[#b8cac5] px-3"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Starts</span>
          <input
            name="startsAt"
            required
            type="datetime-local"
            defaultValue={event ? toDateTimeLocalValue(event.startsAt) : ""}
            className="h-10 rounded-md border border-[#b8cac5] px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={event ? toDateTimeLocalValue(event.endsAt) : ""}
            className="h-10 rounded-md border border-[#b8cac5] px-3"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Location text</span>
        <input
          name="locationText"
          defaultValue={event?.locationText ?? ""}
          className="h-10 rounded-md border border-[#b8cac5] px-3"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Hi.Events event ID</span>
        <input
          name="hiEventsEventId"
          defaultValue={event?.hiEventsEventId ?? ""}
          className="h-10 rounded-md border border-[#b8cac5] px-3"
        />
      </label>

      <button
        type="submit"
        className="h-11 rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e3ece9] bg-white p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-[#6b746f]">
        {label}
      </p>
      <p className="mt-2 font-semibold text-[#183f3c]">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[#eef3f1] px-3 py-1 text-xs font-semibold text-[#4e5b57]">
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

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}
