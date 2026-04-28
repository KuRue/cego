import Link from "next/link";
import {
  approveRsvpForPaymentAction,
  createEventAction,
  updateEventAction,
  updateRsvpStatusAction,
} from "@/lib/event-actions";
import { getAdminEvents, type AdminEventWithRsvps } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import {
  createSurveyAction,
  updateSurveyAction,
} from "@/lib/survey-actions";
import {
  formatSurveyAnswer,
  getAdminSurveys,
  type AdminSurveyOverview,
  type SurveySchema,
} from "@/lib/surveys";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organizer Admin",
};

export default async function AdminPage() {
  const member = await getCurrentMember();

  if (!member || !member.isAdmin) {
    return (
      <AdminShell>
        <div className="max-w-full border border-white/15 bg-white/5 p-5 sm:p-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Organizer access required.
          </h1>
          <p className="mt-3 max-w-2xl break-words leading-7 text-white/70">
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

  const [eventOverviews, surveyOverviews] = await Promise.all([
    getAdminEvents(),
    getAdminSurveys(),
  ]);
  const adminEvents = eventOverviews.map(({ event }) => event);

  return (
    <AdminShell memberName={member.telegramDisplayName}>
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <CreateEventPanel />
        <div className="grid gap-4">
          <div className="border border-white/15 bg-white/5 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
              Events
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {eventOverviews.length} event
              {eventOverviews.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-3 leading-7 text-white/70">
              Draft and archived events stay hidden from members. Open, full,
              and closed events appear on the member dashboard according to RSVP
              rules.
            </p>
          </div>
          <div className="border border-white/15 bg-white/5 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
              Surveys
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {surveyOverviews.length} survey
              {surveyOverviews.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-3 leading-7 text-white/70">
              Published general surveys are visible to all group members. Event
              surveys are visible to members with active RSVPs for that event.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
          Events
        </p>
        <h2 className="mt-2 text-3xl font-semibold">RSVP operations</h2>
      </section>

      <section className="mt-5 grid gap-5">
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

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <CreateSurveyPanel events={adminEvents} />
        <div className="border border-white/15 bg-white/5 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Preferences
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Survey operations</h2>
          <p className="mt-3 leading-7 text-white/70">
            Use one question per line. Prefix a question with * to make it
            required for member submission.
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-5">
        {surveyOverviews.length === 0 ? (
          <div className="border border-white/15 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">No surveys yet.</h2>
            <p className="mt-3 text-white/70">
              Create a general member survey or attach one to an event to
              collect preferences.
            </p>
          </div>
        ) : (
          surveyOverviews.map((overview) => (
            <AdminSurveyCard
              key={overview.survey.id}
              events={adminEvents}
              overview={overview}
            />
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
    <main className="min-h-screen overflow-x-hidden bg-[#14211f] px-4 py-8 text-white sm:px-5">
      <section className="mx-auto w-full max-w-[22rem] sm:max-w-6xl">
        <div className="grid gap-4 sm:flex sm:items-center sm:justify-between">
          <Link href="/" className="font-semibold">
            ARF
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 sm:justify-end">
            {memberName ? <span>{memberName}</span> : null}
            <Link href="/admin/members">Members</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div className="mt-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Organizer admin
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Manage events, capacity, waitlists, and RSVP state.
          </h1>
          <p className="mt-4 leading-7 text-white/70">
            Use the member CRM area for profiles, tags, notes, RSVP history,
            and survey completion filters.
          </p>
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

function CreateSurveyPanel({
  events,
}: {
  events: AdminEventWithRsvps["event"][];
}) {
  return (
    <div className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <h2 className="text-2xl font-semibold">Create survey</h2>
      <SurveyForm
        action={createSurveyAction}
        events={events}
        submitLabel="Create survey"
      />
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
            <Metric label="Capacity" value={`${confirmedCount}/${event.capacity}`} />
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
              <div
                key={rsvp.id}
                className="grid gap-3 border border-[#d7e3df] p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="font-medium">{member.telegramDisplayName}</p>
                  <p className="mt-1 text-sm text-[#64706c]">
                    {member.telegramUsername
                      ? `@${member.telegramUsername}`
                      : member.email || member.groupStatus}
                  </p>
                  {member.email ? (
                    <p className="mt-1 break-all text-sm text-[#64706c]">
                      {member.email}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{rsvp.status}</Badge>
                    {rsvp.hiEventsOrderId ? (
                      <Badge>order {rsvp.hiEventsOrderId}</Badge>
                    ) : null}
                    {rsvp.hiEventsAttendeeId ? (
                      <Badge>attendee {rsvp.hiEventsAttendeeId}</Badge>
                    ) : null}
                  </div>
                  {rsvp.hiEventsCheckoutUrl ? (
                    <a
                      href={rsvp.hiEventsCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-semibold text-[#183f3c]"
                    >
                      Checkout link
                    </a>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-[auto_auto] lg:justify-end">
                  <form
                    action={updateRsvpStatusAction}
                    className="grid gap-2 sm:grid-cols-[auto_auto]"
                  >
                    <input type="hidden" name="rsvpId" value={rsvp.id} />
                    <select
                      name="status"
                      defaultValue={rsvp.status}
                      className="h-10 rounded-md border border-[#b8cac5] bg-white px-3 text-sm"
                    >
                      <option value="confirmed">confirmed</option>
                      <option value="waitlisted">waitlisted</option>
                      <option value="approved_to_pay">approved_to_pay</option>
                      <option value="paid_registered">paid_registered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <button
                      type="submit"
                      className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
                    >
                      Update
                    </button>
                  </form>
                  <PaymentApprovalControl
                    event={event}
                    memberEmail={member.email}
                    rsvp={rsvp}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function PaymentApprovalControl({
  event,
  memberEmail,
  rsvp,
}: {
  event: AdminEventWithRsvps["event"];
  memberEmail: string | null;
  rsvp: AdminEventWithRsvps["rsvps"][number]["rsvp"];
}) {
  if (event.type !== "annual_retreat") {
    return null;
  }

  if (rsvp.status === "paid_registered") {
    return (
      <p className="text-sm font-semibold text-[#183f3c]">Paid and registered</p>
    );
  }

  if (!["confirmed", "waitlisted", "approved_to_pay"].includes(rsvp.status)) {
    return null;
  }

  if (!event.hiEventsEventId) {
    return (
      <p className="max-w-64 text-sm text-[#64706c]">
        Set the Hi.Events event ID before payment approval.
      </p>
    );
  }

  if (!memberEmail) {
    return (
      <p className="max-w-64 text-sm text-[#64706c]">
        Add this member&apos;s email before payment approval.
      </p>
    );
  }

  return (
    <form action={approveRsvpForPaymentAction}>
      <input type="hidden" name="rsvpId" value={rsvp.id} />
      <button
        type="submit"
        className="h-10 rounded-md border border-[#b8cac5] px-4 text-sm font-semibold text-[#183f3c]"
      >
        {rsvp.status === "approved_to_pay" ? "Regenerate link" : "Approve payment"}
      </button>
    </form>
  );
}

function AdminSurveyCard({
  events,
  overview,
}: {
  events: AdminEventWithRsvps["event"][];
  overview: AdminSurveyOverview;
}) {
  const { survey, event, schema, responseCount, responses } = overview;

  return (
    <article className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{survey.status}</Badge>
            <Badge>{event ? "event survey" : "member survey"}</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{survey.title}</h2>
          {survey.description ? (
            <p className="mt-2 leading-7 text-[#4e5b57]">
              {survey.description}
            </p>
          ) : null}
          {event ? (
            <p className="mt-2 text-sm text-[#64706c]">
              Linked to {event.title} on {formatDateRange(event.startsAt, null)}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Questions" value={String(schema.questions.length)} />
            <Metric label="Responses" value={String(responseCount)} />
          </div>
        </div>

        <div className="border border-[#d7e3df] bg-[#f8fbff] p-4">
          <h3 className="font-semibold">Edit survey</h3>
          <SurveyForm
            action={updateSurveyAction}
            events={events}
            overview={overview}
            submitLabel="Save survey"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-[#e3ece9] pt-5">
        <h3 className="font-semibold">Responses</h3>
        {responses.length === 0 ? (
          <p className="mt-3 text-sm text-[#64706c]">No responses yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {responses.map(({ response, member }) => {
              const answers = readAnswerRecord(response.answersJson);

              return (
                <div
                  key={response.id}
                  className="border border-[#d7e3df] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {member.telegramDisplayName}
                      </p>
                      <p className="mt-1 text-sm text-[#64706c]">
                        {member.telegramUsername
                          ? `@${member.telegramUsername}`
                          : member.id}
                      </p>
                    </div>
                    <p className="text-sm text-[#64706c]">
                      {formatResponseDate(response.updatedAt)}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-3">
                    {schema.questions.map((question) => (
                      <div key={question.id}>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#6b746f]">
                          {question.label}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6 text-[#1d2523]">
                          {formatSurveyAnswer(answers[question.id])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
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

function SurveyForm({
  action,
  events,
  overview,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  events: AdminEventWithRsvps["event"][];
  overview?: AdminSurveyOverview;
  submitLabel: string;
}) {
  const survey = overview?.survey;

  return (
    <form action={action} className="mt-4 grid gap-4">
      {survey ? <input type="hidden" name="surveyId" value={survey.id} /> : null}

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Scope</span>
        <select
          name="eventId"
          defaultValue={survey?.eventId ?? ""}
          className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
        >
          <option value="">General member survey</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Title</span>
          <input
            name="title"
            required
            defaultValue={survey?.title}
            className="h-10 rounded-md border border-[#b8cac5] px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            name="status"
            defaultValue={survey?.status ?? "draft"}
            className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="closed">closed</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          name="description"
          defaultValue={survey?.description ?? ""}
          rows={3}
          className="min-h-20 rounded-md border border-[#b8cac5] px-3 py-2 leading-6"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Questions</span>
        <textarea
          name="questions"
          required
          defaultValue={
            overview ? surveyQuestionsToText(overview.schema) : "*Room preference?"
          }
          rows={5}
          className="min-h-32 rounded-md border border-[#b8cac5] px-3 py-2 leading-6"
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

function surveyQuestionsToText(schema: SurveySchema): string {
  return schema.questions
    .map((question) => `${question.required ? "*" : ""}${question.label}`)
    .join("\n");
}

function readAnswerRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
}

function formatResponseDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
