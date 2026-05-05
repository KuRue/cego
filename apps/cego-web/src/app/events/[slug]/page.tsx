import Image from "next/image";
import AppLink from "@/components/app-link";
import { notFound } from "next/navigation";
import { StatusBadge, eventStatusLabel, rsvpStatusLabel } from "@/components/badge";
import AvatarStack from "@/components/avatar-stack";
import { submitSurveyResponseAction } from "@/lib/survey-actions";
import SurveyResponseEditor from "@/components/survey-response-editor";
import Navbar from "@/components/navbar";
import { cancelRsvpAction, markRsvpPendingAction, dropPlusOneAction } from "@/lib/event-actions";
import CancelRsvpButton from "@/components/cancel-rsvp-button";
import ConfirmButton from "@/components/confirm-button";
import RichText from "@/components/rich-text";
import QrCodeDisplay from "@/components/qr-code-display";
import PaymentLink from "@/components/payment-link";
import { getDashboardEventBySlug, getEffectiveRsvpStatus, type EventWithRsvpState } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import { getNavbarBrand } from "@/lib/settings";
import { parsePaymentMethods, getPaymentMethodUrl, getPaymentMethodLabel } from "@/lib/payment-methods";

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
        <main className="page-shell mx-auto max-w-3xl px-5 py-16">
          <div className="glass-lg rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Group access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              This event is only available to members of the configured Telegram group.
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
      <EventDetail eventState={eventState} isAdmin={member.isAdmin} memberName={member.telegramDisplayName} />
    </>
  );
}

function EventDetail({ eventState, isAdmin, memberName }: { eventState: EventWithRsvpState; isAdmin: boolean; memberName: string }) {
  const { event, confirmedCount, waitlistedCount, rsvp, plusOne, rsvpMembers, survey } = eventState;
  const returnTo = `/events/${event.slug}`;
  const effective = getEffectiveRsvpStatus({
    status: event.status,
    startsAt: event.startsAt,
    rsvpOpensAt: event.rsvpOpensAt,
    rsvpClosesAt: event.rsvpClosesAt,
    capacity: event.capacity,
    confirmedCount,
  });
  const isCancelableRsvp =
    (rsvp?.status === "confirmed" || rsvp?.status === "waitlisted") && !rsvp?.checkedInAt;
  const canRsvp =
    (effective === "open" || effective === "full") &&
    (!rsvp || rsvp.status === "cancelled");
  const adminCanRsvp = !canRsvp && isAdmin && effective === "before" && (!rsvp || rsvp.status === "cancelled");
  const canSeeAddress =
    rsvp?.status === "confirmed" &&
    (!event.paymentRequired || rsvp.paymentStatus === "paid" || rsvp.paymentStatus === "waived");

  return (
    <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="mb-5">
        <AppLink
          href="/dashboard"
          className="text-sm font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          Back to dashboard
        </AppLink>
      </div>

      <section className="glass-lg overflow-hidden rounded-2xl">
        {event.imageUrl ? (
          <div className="relative h-64 sm:h-80">
            <Image src={event.imageUrl} alt="" fill className="object-cover" priority />
          </div>
        ) : null}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={event.status} label={eventStatusLabel(event.status, event.startsAt, event.rsvpOpensAt)} />
            {rsvp ? <StatusBadge status={rsvp.status} label={rsvpStatusLabel(rsvp.status)} /> : null}
          </div>
          {rsvpMembers.length > 0 ? (
            <div className="mt-3">
              <AvatarStack members={rsvpMembers} />
            </div>
          ) : null}
          <h1 className="font-title mt-4 max-w-4xl text-4xl font-semibold leading-tight">
            {event.title}
          </h1>
          {event.description ? (
            <p className="mt-4 max-w-3xl text-base leading-8" style={{ color: "var(--color-muted)" }}>
              {event.description}
            </p>
          ) : null}
        </div>
      </section>

      {rsvp && rsvp.status === "confirmed" && canSeeAddress && event.qrCheckInEnabled && !rsvp.checkedInAt ? (
        <div className="qr-ants mt-6 rounded-2xl" style={{ background: "#ffffff", padding: "3px" }}>
          <div className="flex flex-col items-center rounded-2xl py-8" style={{ background: "#ffffff" }}>
            <p className="text-xs uppercase tracking-[0.14em] font-semibold" style={{ color: "#888" }}>
              Check-in QR
            </p>
            <p className="mt-1 text-xs" style={{ color: "#aaa" }}>
              Present this at the door
            </p>
            <div className="mt-4">
              <QrCodeDisplay data={rsvp.id} size={280} />
            </div>
          </div>
        </div>
      ) : event.promoImageUrl ? (
        <div className="promo-shimmer mt-6 overflow-hidden rounded-2xl">
          <Image src={event.promoImageUrl} alt="" width={1200} height={600} className="w-full" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px" />
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Panel title="Event Details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Date" value={formatDateLines(event.startsAt, event.endsAt)} />
              <Detail label="Location" value={event.locationText ?? "Location to be announced"} />
              {event.addressText && canSeeAddress ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                    Address
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.addressText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-4 transition"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {event.addressText}
                    </a>
                  </dd>
                </div>
              ) : null}
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
                    ? plusOne && rsvp?.status !== "cancelled"
                      ? `${formatPrice(event.priceCents, event.currency)} each (${formatPrice(event.priceCents * 2, event.currency)} total)`
                      : formatPrice(event.priceCents, event.currency)
                    : event.paymentRequired
                      ? "Payment required"
                      : "Free"
                }
              />
            </dl>
          </Panel>
        </div>

        <aside className="glass-lg h-fit rounded-2xl p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Registration</h2>

          <div className="mt-5 grid gap-3">
            {canRsvp ? (
              <AppLink
                href={`/events/${event.slug}/rsvp`}
                className="flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                {effective === "full" ? "Join waitlist" : "Start RSVP"}
              </AppLink>
            ) : null}

            {adminCanRsvp ? (
              <AppLink
                href={`/events/${event.slug}/rsvp`}
                className="flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)", opacity: 0.8 }}
              >
                Early RSVP
              </AppLink>
            ) : null}

            {!canRsvp && !isCancelableRsvp && !adminCanRsvp ? (
              <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--color-surface-hover)" }}>
                {effective === "before"
                  ? "RSVPs are not open yet."
                  : effective === "closed" || effective === "past"
                    ? "RSVPs are closed."
                    : "Your RSVP is recorded."}
              </p>
            ) : null}
          </div>

          {rsvp && rsvp.status !== "cancelled" ? (
            <div className="mt-5 rounded-xl p-4" style={{ border: "1px solid var(--color-surface-border)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                  RSVP
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">{memberName}</span>
                <span
                  className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: rsvp.status === "confirmed" ? "var(--color-success)" : "var(--color-warning)",
                    color: "#fff",
                  }}
                >
                  {rsvpStatusLabel(rsvp.status)}
                </span>
              </div>
              {plusOne && plusOne.status !== "cancelled" ? (
                <div className="mt-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-surface-border)", paddingTop: "0.75rem" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--color-muted)" }}>+1:</span>
                    <span className="text-sm font-medium">{plusOne.plusOneName}</span>
                  </div>
                  <span
                    className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      background: plusOne.status === "confirmed" ? "var(--color-success)" : "var(--color-warning)",
                      color: "#fff",
                    }}
                  >
                    {rsvpStatusLabel(plusOne.status)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {rsvp?.status === "confirmed" && event.paymentRequired && event.paymentMethods && rsvp.paymentStatus !== "paid" && rsvp.paymentStatus !== "waived" ? (
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                border: "2px solid var(--color-warning)",
                background: "var(--color-warning-bg)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                  Payment
                </p>
                <span
                  className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: "var(--color-warning)",
                    color: "#fff",
                  }}
                >
                  {rsvp.paymentStatus === "pending" ? "Pending" : "Unpaid"}
                </span>
              </div>

              {event.priceCents !== null ? (
                <p className="mt-3 text-lg font-semibold">
                  {formatPrice(
                    plusOne && plusOne.status === "confirmed"
                      ? event.priceCents * 2
                      : event.priceCents,
                    event.currency,
                  )}
                </p>
              ) : null}

              {plusOne && plusOne.status === "waitlisted" ? (
                <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "var(--color-surface-hover)" }}>
                  <p className="font-semibold">Your +1 is on the waitlist</p>
                  <p className="mt-1" style={{ color: "var(--color-muted)" }}>
                    {plusOne.plusOneName} is waitlisted and doesn't need payment yet. You can wait for a spot to open up, or drop them from your registration.
                  </p>
                  <form action={dropPlusOneAction} className="mt-2">
                    <input type="hidden" name="rsvpId" value={rsvp.id} />
                    <input type="hidden" name="returnTo" value={`/events/${event.slug}`} />
                    <ConfirmButton
                      type="submit"
                      message={`Remove ${plusOne.plusOneName} from your RSVP?`}
                      className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                      style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)", color: "var(--color-foreground)" }}
                    >
                      Drop +1
                    </ConfirmButton>
                  </form>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2">
                {parsePaymentMethods(event.paymentMethods).map((m, i) => {
                  const hasConfirmedPlusOne = plusOne && plusOne.status === "confirmed";
                  const price = hasConfirmedPlusOne ? event.priceCents! * 2 : event.priceCents;
                  const url = getPaymentMethodUrl(m, price);
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-sm">
                        <span className="font-semibold">{getPaymentMethodLabel(m.type)}</span>{" "}
                        <span style={{ color: "var(--color-muted)" }}>{m.handle}</span>
                      </span>
                      {url ? (
                        <PaymentLink href={url} label="Pay" displayName={memberName} />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {rsvp.paymentStatus === "unpaid" ? (
                <form action={markRsvpPendingAction} className="mt-3">
                  <input type="hidden" name="rsvpId" value={rsvp.id} />
                  <input type="hidden" name="returnTo" value={`/events/${event.slug}`} />
                  <ConfirmButton
                    type="submit"
                    message="Mark this as paid? The organizer will review and confirm."
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition"
                    style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                  >
                    Mark as paid
                  </ConfirmButton>
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--color-muted)" }}>
                    This lets the organizer know you've sent payment. They'll confirm once received.
                  </p>
                </form>
              ) : null}

              {rsvp.paymentStatus === "pending" ? (
                <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "var(--color-warning-bg)" }}>
                  <p className="font-semibold" style={{ color: "var(--color-warning)" }}>Payment pending review</p>
                  <p className="mt-1" style={{ color: "var(--color-muted)" }}>You've marked this as paid. The organizer will confirm once they receive it.</p>
                </div>
              ) : null}

              {event.paymentDueDate ? (
                <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  Payment due by {formatDateOnly(event.paymentDueDate)}.
                </p>
              ) : null}
            </div>
          ) : null}

          {rsvp?.status === "confirmed" && event.paymentRequired && (rsvp.paymentStatus === "paid" || rsvp.paymentStatus === "waived") ? (
            <div className="mt-5 rounded-xl p-4" style={{ border: "1px solid var(--color-surface-border)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                  Payment
                </p>
                <span
                  className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: "var(--color-success)",
                    color: "#fff",
                  }}
                >
                  {rsvp.paymentStatus === "paid" ? "Payment confirmed" : "Waived"}
                </span>
              </div>
              {event.priceCents !== null ? (
                <p className="mt-2 text-lg font-semibold">
                  {formatPrice(
                    plusOne && plusOne.status === "confirmed"
                      ? event.priceCents * 2
                      : event.priceCents,
                    event.currency,
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {rsvp?.status === "confirmed" && event.paymentRequired && (rsvp.paymentStatus === "paid" || rsvp.paymentStatus === "waived") && plusOne && plusOne.status === "waitlisted" ? (
            <div className="mt-5 rounded-xl p-4" style={{ border: "1px solid var(--color-surface-border)" }}>
              <p className="font-semibold text-sm">Your +1 is on the waitlist</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                {plusOne.plusOneName} is waitlisted. You'll be notified if a spot opens up, or you can drop them below.
              </p>
              <form action={dropPlusOneAction} className="mt-2">
                <input type="hidden" name="rsvpId" value={rsvp.id} />
                <input type="hidden" name="returnTo" value={`/events/${event.slug}`} />
                <ConfirmButton
                  type="submit"
                  message={`Remove ${plusOne.plusOneName} from your RSVP?`}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                  style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)", color: "var(--color-foreground)" }}
                >
                  Drop +1
                </ConfirmButton>
              </form>
            </div>
          ) : null}

          {rsvp && rsvp.status !== "cancelled" && !rsvp.checkedInAt && survey && survey.schema.questions.length > 0 ? (
            <div className="mt-5 rounded-xl p-4" style={{ border: "1px solid var(--color-surface-border)" }}>
              <p className="text-xs uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--color-muted)" }}>
                {survey.title}
              </p>
              <SurveyResponseEditor
                surveyId={survey.id}
                eventId={event.id}
                questions={survey.schema.questions}
                existingAnswers={
                  survey.response?.answersJson && typeof survey.response.answersJson === "object"
                    ? survey.response.answersJson as Record<string, string>
                    : {}
                }
                action={submitSurveyResponseAction}
                returnTo={`/events/${event.slug}`}
              />
            </div>
          ) : null}

          {isCancelableRsvp ? (
            <form action={cancelRsvpAction} className="mt-6">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <CancelRsvpButton
                type="submit"
                className="h-11 w-full rounded-xl px-5 text-sm font-semibold transition"
                style={{
                  background: "var(--color-surface-hover)",
                  border: "1px solid var(--color-surface-border)",
                  color: "var(--color-foreground)",
                }}
              >
                Cancel RSVP
              </CancelRsvpButton>
            </form>
          ) : null}
        </aside>
      </section>

      {rsvp && rsvp.status !== "cancelled" && (event.rulesText || event.termsText || event.refundPolicyText) ? (
    <details className="mt-6 glass-lg rounded-2xl p-5">
      <summary
        className="cursor-pointer text-sm font-semibold"
        style={{ color: "var(--color-accent)" }}
      >
        Event Policies
      </summary>
      <div className="mt-3 grid gap-3">
            {event.rulesText ? <PolicyBlock title="Rules" body={event.rulesText} /> : null}
            {event.termsText ? <PolicyBlock title="Terms" body={event.termsText} /> : null}
            {event.refundPolicyText ? <PolicyBlock title="Cancellation & Refund Policy" body={event.refundPolicyText} /> : null}
          </div>
        </details>
      ) : null}
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
      <dd className="mt-1 leading-6 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function PolicyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1">
        <RichText>{body}</RichText>
      </div>
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

function formatDateLines(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)}\nto ${formatter.format(endsAt)}`;
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
