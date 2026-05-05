import Image from "next/image";
import AppLink from "@/components/app-link";
import { Badge, StatusBadge, eventStatusLabel, rsvpStatusLabel } from "@/components/badge";
import AvatarStack from "@/components/avatar-stack";
import { cancelRsvpAction } from "@/lib/event-actions";
import { getDashboardEvents, getEffectiveRsvpStatus, type EventWithRsvpState } from "@/lib/events";
import StopPropagation from "@/components/stop-propagation";
import CancelRsvpButton from "@/components/cancel-rsvp-button";
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
    getDashboardEvents(member.id).catch(() => []),
    getDashboardSurveys(member.id).catch(() => []),
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
      </main>
    </>
  );
}

function EventCard({ eventState }: { eventState: EventWithRsvpState }) {
  const { event, confirmedCount, waitlistedCount, rsvp, plusOne, rsvpMembers } = eventState;
  const effective = getEffectiveRsvpStatus({
    status: event.status,
    startsAt: event.startsAt,
    rsvpOpensAt: event.rsvpOpensAt,
    rsvpClosesAt: event.rsvpClosesAt,
    capacity: event.capacity,
    confirmedCount,
  });
  const isCancelableRsvp =
    rsvp?.status === "confirmed" || rsvp?.status === "waitlisted";
  const canRsvp =
    (effective === "open" || effective === "full") &&
    (!rsvp || rsvp.status === "cancelled");
  const spotsLeft = event.capacity - confirmedCount;

  return (
    <AppLink href={`/events/${event.slug}`} className="block">
      <article className="glass-lg glass-hover overflow-hidden rounded-2xl transition">
        {/* Mobile: image card overlay */}
        <div className="relative block md:hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              width={600}
              height={400}
              className="h-56 w-full object-cover"
            />
          ) : (
            <div
              className="flex h-56 items-center justify-center"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          {/* Top row pills */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <span
              className="inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(0,0,0,0.55)", color: "white", backdropFilter: "blur(8px)" }}
            >
              {getCountdownLabel(event)}
            </span>
            {rsvp && rsvp.status !== "cancelled" ? (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: rsvp.status === "confirmed" ? "rgba(34,197,94,0.85)" : "rgba(234,179,8,0.85)",
                  color: rsvp.status === "confirmed" ? "#fff" : "#1a1d23",
                  backdropFilter: "blur(8px)",
                }}
              >
                {rsvpStatusLabel(rsvp.status)}
              </span>
            ) : null}
          </div>

          {rsvpMembers.length > 0 ? (
            <div className="absolute top-12 left-3">
              <AvatarStack members={rsvpMembers} />
            </div>
          ) : null}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-title text-2xl font-bold text-white leading-tight">{event.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white"
                style={{ backdropFilter: "blur(8px)" }}
              >
                {formatDateRangeShort(event.startsAt, event.endsAt)}
              </span>
              {effective === "open" || effective === "full" ? (
                <span
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white"
                  style={{ backdropFilter: "blur(8px)" }}
                >
                  {rsvp?.status === "waitlisted"
                    ? "Waitlisted"
                    : spotsLeft > 0
                      ? `Spots left: ${spotsLeft}`
                      : "Full"}
                </span>
              ) : null}
              {rsvp?.status === "confirmed" && event.paymentRequired && rsvp.paymentStatus !== "paid" && rsvp.paymentStatus !== "waived" ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: "rgba(234,179,8,0.8)", color: "#1a1d23" }}
                >
                  Payment due
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="hidden md:flex md:flex-row">
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
                <StatusBadge status={event.status} label={eventStatusLabel(event.status, event.startsAt, event.rsvpOpensAt)} />
                {rsvp ? <StatusBadge status={rsvp.status} label={rsvpStatusLabel(rsvp.status)} /> : null}
              </div>
              <h3 className="font-title mt-3 text-2xl font-semibold">{event.title}</h3>
              {rsvpMembers.length > 0 ? (
                <div className="mt-2">
                  <AvatarStack members={rsvpMembers} />
                </div>
              ) : null}
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

              {rsvp?.status === "confirmed" && event.paymentRequired && rsvp.paymentStatus !== "paid" && rsvp.paymentStatus !== "waived" ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: "rgba(234,179,8,0.8)", color: "#1a1d23" }}
                >
                  Payment due
                </span>
              ) : null}
              {rsvp?.status === "confirmed" && event.paymentRequired && rsvp.paymentStatus === "paid" ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: "rgba(34,197,94,0.8)", color: "#fff" }}
                >
                  Paid
                </span>
              ) : null}

              {rsvp && rsvp.status !== "cancelled" && plusOne && plusOne.status !== "cancelled" ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--color-surface-hover)" }}>
                  <span style={{ color: "var(--color-muted)" }}>+1:</span>
                  <span className="font-medium">{plusOne.plusOneName}</span>
                  <StatusBadge status={plusOne.status} label={rsvpStatusLabel(plusOne.status)} />
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {canRsvp ? (
                <span
                  className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  RSVP
                </span>
              ) : null}

              {isCancelableRsvp ? (
                <StopPropagation>
                  <form action={cancelRsvpAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <CancelRsvpButton
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
                      style={{
                        background: "var(--color-surface-hover)",
                        border: "1px solid var(--color-surface-border)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      Cancel RSVP
                    </CancelRsvpButton>
                  </form>
                </StopPropagation>
              ) : null}

              {!canRsvp && !isCancelableRsvp ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  {effective === "before"
                    ? "RSVPs not open yet."
                    : effective === "closed" || effective === "past"
                      ? "RSVPs closed."
                      : "Your RSVP is recorded."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </AppLink>
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
              {question.type === "select" && question.options ? (
                <select
                  name={`answer:${question.id}`}
                  required={question.required}
                  defaultValue={readAnswer(response?.answersJson, question.id)}
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-surface-border)",
                    color: "var(--color-foreground)",
                  }}
                >
                  <option value="">Select...</option>
                  {question.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
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
              )}
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

function formatDateRangeShort(startsAt: Date, endsAt: Date | null): string {
  const monthDay = { month: "short", day: "numeric" } as const;
  const full = { month: "short", day: "numeric", year: "numeric" } as const;

  if (!endsAt) {
    return new Intl.DateTimeFormat("en-US", full).format(startsAt);
  }

  const sameYear = startsAt.getFullYear() === endsAt.getFullYear();
  const sameMonth = startsAt.getMonth() === endsAt.getMonth();

  if (sameMonth && sameYear) {
    const m = new Intl.DateTimeFormat("en-US", { month: "short" }).format(startsAt);
    const d1 = startsAt.getDate();
    const d2 = endsAt.getDate();
    const y = startsAt.getFullYear();
    return `${m} ${d1}-${d2}, ${y}`;
  }

  if (sameYear) {
    const fmt = new Intl.DateTimeFormat("en-US", monthDay);
    return `${fmt.format(startsAt)} - ${fmt.format(endsAt)}, ${startsAt.getFullYear()}`;
  }

  const fmt = new Intl.DateTimeFormat("en-US", full);
  return `${fmt.format(startsAt)} - ${fmt.format(endsAt)}`;
}

function getCountdownLabel(event: {
  status: string;
  startsAt: Date;
  rsvpOpensAt: Date | null;
  rsvpClosesAt: Date | null;
}): string {
  const now = Date.now();
  const fmtDays = (ms: number) => {
    const d = Math.ceil(ms / 86400000);
    if (d > 1) return `${d} days`;
    if (d === 1) return "1 day";
    const h = Math.ceil(ms / 3600000);
    if (h > 1) return `${h}h`;
    return "soon";
  };

  if (event.status === "archived") return "Archived";
  if (event.status === "closed") return "RSVPs closed";

  if (event.rsvpOpensAt) {
    const diff = event.rsvpOpensAt.getTime() - now;
    if (diff > 0) return `RSVP opens in ${fmtDays(diff)}`;
  }

  if (event.rsvpClosesAt) {
    const diff = event.rsvpClosesAt.getTime() - now;
    if (diff > 0) return `RSVP closes in ${fmtDays(diff)}`;
  }

  const diff = event.startsAt.getTime() - now;
  if (diff > 0) return `Event in ${fmtDays(diff)}`;

  return "Past";
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
