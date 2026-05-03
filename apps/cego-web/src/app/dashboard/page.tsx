import Image from "next/image";
import AppLink from "@/components/app-link";
import { Badge, StatusBadge, eventStatusLabel, rsvpStatusLabel } from "@/components/badge";
import { cancelRsvpAction, rsvpForEventAction } from "@/lib/event-actions";
import { getDashboardEvents, type EventWithRsvpState } from "@/lib/events";
import type { Rsvp } from "@cego/db";
import { updateCurrentMemberEmailAction } from "@/lib/member-actions";
import { getCurrentMember } from "@/lib/session";
import { submitSurveyResponseAction } from "@/lib/survey-actions";
import { getDashboardSurveys, type DashboardSurvey } from "@/lib/surveys";
import Navbar from "@/components/navbar";
import { getNavbarBrand } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const member = await getCurrentMember();
  const brand = await getNavbarBrand();

  if (!member) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-6xl px-5 py-16">
          <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
            <div
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-xl font-bold"
              style={{ background: "var(--color-surface-hover)", color: "var(--color-muted)" }}
            >
              ?
            </div>
            <h1 className="text-xl font-semibold">Sign in to see events</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              cego uses your Telegram identity instead of passwords.
            </p>
            <AppLink
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in with Telegram
            </AppLink>
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
        <main className="page-shell mx-auto max-w-6xl px-5 py-16">
          <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Group access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              This account is signed in, but cego events are only open to members of the
              configured Telegram group.
            </p>
            <AppLink
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Refresh access
            </AppLink>
          </div>
        </main>
      </>
    );
  }

  const [eventStates, surveyStates] = await Promise.all([
    getDashboardEvents(member.id),
    getDashboardSurveys(member.id),
  ]);

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
      <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
        <section>
          <h1 className="text-3xl font-semibold">Events</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            Upcoming events from your community. RSVP to secure your spot.
          </p>

          {eventStates.length === 0 ? (
            <div className="glass-lg mt-8 rounded-2xl p-8 text-center">
              <p className="font-medium">No events right now</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Once organizers publish an event, it will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6">
              {eventStates.map((eventState) => (
                <EventCard key={eventState.event.id} eventState={eventState} />
              ))}
            </div>
          )}
        </section>

        {surveyStates.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Surveys</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Help organizers plan by answering these surveys.
            </p>
            <div className="mt-6 grid gap-6">
              {surveyStates.map((surveyState) => (
                <SurveyCard
                  key={surveyState.survey.id}
                  surveyState={surveyState}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Contact email</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                  Give organizers a reliable way to reach you.
                </p>
              </div>
              <form action={updateCurrentMemberEmailAction} className="flex gap-2">
                <input
                  name="email"
                  type="email"
                  defaultValue={member.email ?? ""}
                  placeholder="you@example.com"
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
                <button
                  type="submit"
                  className="h-10 rounded-xl px-5 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  Save
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function EventCard({ eventState }: { eventState: EventWithRsvpState }) {
  const { event, confirmedCount, waitlistedCount, rsvp, plusOne } = eventState;
  const isCancelableRsvp =
    rsvp?.status === "confirmed" || rsvp?.status === "waitlisted";
  const canRsvp =
    (event.status === "open" || event.status === "full") &&
    (!rsvp || rsvp.status === "cancelled");

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
            className="flex items-center justify-center md:w-72 lg:w-80"
            style={{ background: "var(--color-surface-hover)" }}
          >
            <span
              className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              {event.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} label={eventStatusLabel(event.status, event.startsAt)} />
              {rsvp ? <StatusBadge status={rsvp.status} label={rsvpStatusLabel(rsvp.status)} /> : null}
            </div>
            <h3 className="mt-3 text-xl font-semibold">{event.title}</h3>
            {event.description ? (
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
                {event.description}
              </p>
            ) : null}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <EventDetail label="Date" value={formatDateRange(event.startsAt, event.endsAt)} />
              {event.locationText ? (
                <EventDetail label="Location" value={event.locationText} />
              ) : null}
              <EventDetail
                label="Capacity"
                value={`${confirmedCount}/${event.capacity} spots filled${
                  waitlistedCount > 0 ? `; ${waitlistedCount} waitlisted` : ""
                }`}
              />
              {event.priceCents !== null || event.paymentRequired ? (
                <EventDetail
                  label="Price"
                  value={
                    event.priceCents !== null
                      ? plusOne && rsvp?.status !== "cancelled"
                        ? `${formatPrice(event.priceCents, event.currency)} each (${formatPrice(event.priceCents * 2, event.currency)} total)`
                        : formatPrice(event.priceCents, event.currency)
                      : "Payment required"
                  }
                />
              ) : null}
            </dl>

            {rsvp && rsvp.status !== "cancelled" && plusOne && plusOne.status !== "cancelled" ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--color-surface-hover)" }}>
                <span style={{ color: "var(--color-muted)" }}>+1:</span>
                <span className="font-medium">{plusOne.plusOneName}</span>
                <StatusBadge status={plusOne.status} label={rsvpStatusLabel(plusOne.status)} />
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <AppLink
              href={`/events/${event.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            >
              View details
            </AppLink>

            {canRsvp ? (
              <form action={rsvpForEventAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  RSVP
                </button>
                <input
                  name="plusOneName"
                  type="text"
                  placeholder="+1 name (optional)"
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                />
              </form>
            ) : null}

            {isCancelableRsvp ? (
              <form action={cancelRsvpAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
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
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                {event.status === "closed"
                  ? "This event is closed."
                  : "Your RSVP is recorded."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EventDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
        {label}
      </dt>
      <dd className="mt-1 leading-6">{value}</dd>
    </div>
  );
}

function SurveyCard({ surveyState }: { surveyState: DashboardSurvey }) {
  const { survey, event, schema, response } = surveyState;
  const hasQuestions = schema.questions.length > 0;

  return (
    <article className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{event ? "Event survey" : "Member survey"}</Badge>
        {response ? <StatusBadge status="submitted" /> : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{survey.title}</h3>
      {survey.description ? (
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          {survey.description}
        </p>
      ) : null}
      {event ? (
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          Linked to {event.title} on {formatDateRange(event.startsAt, null)}
        </p>
      ) : null}

      <form action={submitSurveyResponseAction} className="mt-4 grid gap-4">
        <input type="hidden" name="surveyId" value={survey.id} />
        {hasQuestions ? (
          schema.questions.map((question) => (
            <label key={question.id} className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {question.label}
                {question.required ? (
                  <span style={{ color: "var(--color-danger)" }}> *</span>
                ) : null}
              </span>
              <textarea
                name={`answer:${question.id}`}
                required={question.required}
                defaultValue={readAnswer(response?.answersJson, question.id)}
                rows={3}
                className="min-h-20 rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "var(--color-surface-hover)",
                  border: "1px solid var(--color-surface-border)",
                  color: "var(--color-foreground)",
                }}
              />
            </label>
          ))
        ) : (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            No questions yet.
          </p>
        )}

        <button
          type="submit"
          disabled={!hasQuestions}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold transition sm:w-auto"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-on-accent)",
            opacity: hasQuestions ? 1 : 0.5,
          }}
        >
          {response ? "Save response" : "Submit response"}
        </button>
      </form>
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

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
