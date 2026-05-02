import Link from "next/link";
import { cancelRsvpAction, rsvpForEventAction } from "@/lib/event-actions";
import { getDashboardEvents, type EventWithRsvpState } from "@/lib/events";
import { updateCurrentMemberEmailAction } from "@/lib/member-actions";
import { getCurrentMember } from "@/lib/session";
import { submitSurveyResponseAction } from "@/lib/survey-actions";
import { getDashboardSurveys, type DashboardSurvey } from "@/lib/surveys";

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
          body="ARF uses Telegram identity instead of password accounts. Sign in with Telegram to create your ARF session."
          action={<PrimaryLink href="/sign-in">Sign in with Telegram</PrimaryLink>}
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
          action={<PrimaryLink href="/sign-in">Refresh Telegram access</PrimaryLink>}
        />
      </DashboardShell>
    );
  }

  const [eventStates, surveyStates] = await Promise.all([
    getDashboardEvents(member.id),
    getDashboardSurveys(member.id),
  ]);
  const capacityCount = eventStates.filter(({ rsvp }) =>
    ["confirmed", "approved_to_pay", "paid_registered"].includes(
      rsvp?.status ?? "",
    ),
  ).length;
  const waitlistedCount = eventStates.filter(
    ({ rsvp }) => rsvp?.status === "waitlisted",
  ).length;
  const completedSurveyCount = surveyStates.filter(
    ({ response }) => response,
  ).length;

  return (
    <DashboardShell memberName={member.telegramDisplayName}>
      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Active events" value={String(eventStates.length)} />
        <StatusCard label="Capacity spots" value={String(capacityCount)} />
        <StatusCard label="Waitlisted" value={String(waitlistedCount)} />
        <StatusCard
          label="Surveys done"
          value={`${completedSurveyCount}/${surveyStates.length}`}
        />
      </section>

      <section className="mt-6 border border-[#d7e3df] bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-[#14211f]">
              Contact email
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-[#4e5b57]">
              Annual retreat payment approval requires an email so Hi.Events
              registration can be linked back to your ARF profile. Use this
              same email at checkout.
            </p>
          </div>
          <form action={updateCurrentMemberEmailAction} className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={member.email ?? ""}
                className="h-10 rounded-md border border-[#b8cac5] px-3"
              />
            </label>
            <button
              type="submit"
              className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
            >
              Save email
            </button>
          </form>
        </div>
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

      <section className="mt-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
            Preferences
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Surveys</h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#4e5b57]">
            These responses are attached to your Telegram-backed ARF profile so
            organizers can plan rooming, food, activities, and retreat details.
          </p>
        </div>

        {surveyStates.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No surveys are available yet."
              body="Published general surveys and event-specific surveys for your active RSVPs will appear here."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {surveyStates.map((surveyState) => (
              <SurveyCard
                key={surveyState.survey.id}
                surveyState={surveyState}
              />
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
            <Link href="/sign-in">Telegram sign-in</Link>
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
  const isCancelableRsvp =
    rsvp?.status === "confirmed" ||
    rsvp?.status === "waitlisted" ||
    rsvp?.status === "approved_to_pay";
  const canRsvp =
    (event.status === "open" || event.status === "full") &&
    (!rsvp || rsvp.status === "cancelled");
  const canCheckout =
    event.type === "annual_retreat" &&
    rsvp?.status === "approved_to_pay" &&
    Boolean(rsvp.hiEventsCheckoutUrl);

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
          <Metric label="Capacity" value={`${confirmedCount}/${event.capacity}`} />
          <Metric label="Waitlist" value={String(waitlistedCount)} />
        </div>
      </div>

      <div className="mt-5 border-t border-[#e3ece9] pt-5">
        {rsvp?.status === "approved_to_pay" ? (
          <div className="mb-4 border border-[#f0d487] bg-[#fff8df] p-4 text-sm text-[#6b4c00]">
            <p className="font-semibold">Payment approved.</p>
            <p className="mt-1">
              Complete Hi.Events checkout with the email saved on this
              dashboard so ARF can link the registration automatically.
            </p>
            {canCheckout ? (
              <a
                href={rsvp.hiEventsCheckoutUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white sm:w-auto"
              >
                Open Hi.Events checkout
              </a>
            ) : (
              <p className="mt-2">The checkout link is not available yet.</p>
            )}
          </div>
        ) : null}

        {rsvp?.status === "paid_registered" ? (
          <div className="mb-4 border border-[#8bb5aa] bg-[#edf8f4] p-4 text-sm text-[#183f3c]">
            <p className="font-semibold">Payment and registration complete.</p>
            {rsvp.ticketType ? <p className="mt-1">{rsvp.ticketType}</p> : null}
          </div>
        ) : null}

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

        {isCancelableRsvp ? (
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

        {!canRsvp && !isCancelableRsvp && !canCheckout ? (
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

function SurveyCard({ surveyState }: { surveyState: DashboardSurvey }) {
  const { survey, event, schema, response } = surveyState;
  const hasQuestions = schema.questions.length > 0;

  return (
    <article className="border border-[#d7e3df] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="active">
              {event ? "Event survey" : "Member survey"}
            </Badge>
            {response ? <Badge tone="rsvp">submitted</Badge> : null}
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-[#14211f]">
            {survey.title}
          </h3>
          {survey.description ? (
            <p className="mt-2 max-w-2xl leading-7 text-[#4e5b57]">
              {survey.description}
            </p>
          ) : null}
          {event ? (
            <p className="mt-2 text-sm text-[#64706c]">
              Linked to {event.title} on {formatDateRange(event.startsAt, null)}
            </p>
          ) : null}
        </div>
        <Metric
          label="Questions"
          value={String(schema.questions.length)}
        />
      </div>

      <form action={submitSurveyResponseAction} className="mt-5 grid gap-4">
        <input type="hidden" name="surveyId" value={survey.id} />
        {hasQuestions ? (
          schema.questions.map((question) => (
            <label key={question.id} className="grid gap-2 text-sm">
              <span className="font-medium text-[#14211f]">
                {question.label}
                {question.required ? (
                  <span className="text-[#b4573f]"> *</span>
                ) : null}
              </span>
              <textarea
                name={`answer:${question.id}`}
                required={question.required}
                defaultValue={readAnswer(response?.answersJson, question.id)}
                rows={3}
                className="min-h-24 rounded-md border border-[#b8cac5] px-3 py-2 leading-6"
              />
            </label>
          ))
        ) : (
          <p className="text-sm text-[#64706c]">
            This survey does not have any questions yet.
          </p>
        )}

        <button
          type="submit"
          disabled={!hasQuestions}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white transition hover:bg-[#245b55] disabled:cursor-not-allowed disabled:bg-[#9ba7a3] sm:w-auto"
        >
          {response ? "Save response" : "Submit response"}
        </button>
      </form>
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

function readAnswer(answersJson: unknown, questionId: string): string {
  if (
    typeof answersJson !== "object" ||
    answersJson === null ||
    !(questionId in answersJson)
  ) {
    return "";
  }

  const value = (answersJson as Record<string, unknown>)[questionId];

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}
