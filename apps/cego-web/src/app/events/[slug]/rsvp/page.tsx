import AppLink from "@/components/app-link";
import { notFound } from "next/navigation";
import { StatusBadge, eventStatusLabel, rsvpStatusLabel } from "@/components/badge";
import Navbar from "@/components/navbar";
import { rsvpForEventAction, adminRsvpForEventAction } from "@/lib/event-actions";
import { getRsvpPageData, getEffectiveRsvpStatus } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import { formatDateWithTime as fmtDateWithTime } from "@/lib/format-date";
import { parsePaymentMethods, getPaymentMethodUrl, getPaymentMethodLabel } from "@/lib/payment-methods";
import PaymentLink from "@/components/payment-link";
import RichText from "@/components/rich-text";
import { formatPrice } from "@/lib/format-price";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "RSVP",
};

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rsvp_error?: string }>;
}) {
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();
  const member = await getCurrentMember();
  const { rsvp_error } = await searchParams;

  if (!member || member.groupStatus !== "member") {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-3xl px-5 py-16">
          <div className="glass-lg rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Sign in to RSVP</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              You need to be a group member to register for events.
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

  const { slug } = await params;
  const data = await getRsvpPageData(member.id, slug);

  if (!data) notFound();

  const alreadyRsvpd =
    data.rsvp && data.rsvp.status !== "cancelled" && data.rsvp.status !== "expired";

  const effective = getEffectiveRsvpStatus({
    status: data.event.status,
    startsAt: data.event.startsAt,
    rsvpOpensAt: data.event.rsvpOpensAt,
    rsvpClosesAt: data.event.rsvpClosesAt,
    capacity: data.event.capacity,
    confirmedCount: data.confirmedCount,
  });

  const canRsvp = effective === "open" || effective === "full";
  const adminCanRsvp = !canRsvp && member.isAdmin && effective === "before";

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
      <main className="page-shell mx-auto max-w-3xl px-5 pb-16 pt-8">
        {rsvp_error ? (
          <div
            className="mb-5 rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
          >
            RSVP failed. Please try again or contact an organizer.
          </div>
        ) : null}
        <div className="mb-5">
          <AppLink
            href={`/events/${slug}`}
            className="text-sm font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            Back to event
          </AppLink>
        </div>

        <h1 className="font-title text-3xl">Register for {data.event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={data.event.status} label={eventStatusLabel(data.event.status, data.event.startsAt, undefined, settings.timezone)} />
          {alreadyRsvpd ? (
            <StatusBadge status={data.rsvp!.status} label={rsvpStatusLabel(data.rsvp!.status)} />
          ) : null}
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {data.confirmedCount}/{data.event.capacity} spots filled
          {data.waitlistedCount > 0 ? `; ${data.waitlistedCount} waitlisted` : ""}
          {data.event.priceCents !== null ? ` · ${formatPrice(data.event.priceCents, data.event.currency)}` : ""}
        </p>

        {alreadyRsvpd ? (
          <AlreadyRegistered data={data} slug={slug} displayName={member.telegramDisplayName} timezone={settings.timezone} />
        ) : canRsvp || adminCanRsvp ? (
          <RsvpForm data={data} slug={slug} action={canRsvp ? rsvpForEventAction : adminRsvpForEventAction} adminBypass={adminCanRsvp && !canRsvp} spotsLeft={data.event.capacity - data.confirmedCount} />
        ) : (
          <div className="glass-lg mt-8 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold">RSVPs are not open yet</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              {effective === "closed" || effective === "past"
                ? "Registration for this event has closed."
                : "Registration will open closer to the event date."}
            </p>
            <AppLink
              href={`/events/${slug}`}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            >
              Back to event
            </AppLink>
          </div>
        )}
      </main>
    </>
  );
}

function AlreadyRegistered({ data, slug, displayName, timezone }: { data: NonNullable<Awaited<ReturnType<typeof getRsvpPageData>>>; slug: string; displayName: string; timezone: string }) {
  const hasConfirmedPlusOne = data.plusOne?.status === "confirmed";
  const parentPaymentSettled = data.rsvp!.paymentStatus === "paid" || data.rsvp!.paymentStatus === "waived";
  const plusOneNeedsPayment =
    parentPaymentSettled &&
    hasConfirmedPlusOne &&
    data.plusOne!.paymentStatus !== "paid" &&
    data.plusOne!.paymentStatus !== "waived";
  const showPayment = data.event.paymentRequired && data.event.paymentMethods && (!parentPaymentSettled || plusOneNeedsPayment);
  const paymentDeadline = plusOneNeedsPayment ? data.plusOne!.paymentDeadlineAt : data.rsvp!.paymentDeadlineAt;

  const showDeadline = paymentDeadline && (plusOneNeedsPayment ? data.plusOne!.paymentStatus === "unpaid" : data.rsvp!.paymentStatus === "unpaid");

  return (
    <div className="glass-lg mt-8 rounded-2xl p-6">
      {data.rsvp?.status === "confirmed" && data.plusOne && data.plusOne.status === "waitlisted" ? (
        <>
          <p className="text-lg font-semibold">You&apos;re confirmed!</p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            Your spot is confirmed, but {data.plusOne.plusOneName} is on the waitlist. You can wait for a spot to open up or drop them to pay for just yourself.
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">You&apos;re registered!</p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            Your RSVP status: <strong>{rsvpStatusLabel(data.rsvp!.status)}</strong>
            {data.plusOne && data.plusOne.status !== "cancelled" ? (
              <> · +1: <strong>{data.plusOne.plusOneName}</strong> ({rsvpStatusLabel(data.plusOne.status)})</>
            ) : null}
          </p>
        </>
      )}

      {data.rsvp!.status === "confirmed" && showPayment ? (
        <div className="mt-4 rounded-xl p-4" style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}>
          <p className="text-center font-bold">Payment{showDeadline ? ` due ${fmtDateWithTime(paymentDeadline!, timezone)}` : ""}</p>
          <div className="mt-2 grid gap-2">
            {parsePaymentMethods(data.event.paymentMethods!).map((m, i) => {
              const price = plusOneNeedsPayment
                ? data.event.priceCents
                : hasConfirmedPlusOne
                  ? data.event.priceCents! * 2
                  : data.event.priceCents;
              const url = getPaymentMethodUrl(m, price);
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    <span className="font-semibold">{getPaymentMethodLabel(m.type)}</span>{" "}
                    <span style={{ color: "var(--color-muted)" }}>{m.handle}</span>
                  </span>
                  {url ? (
                    <PaymentLink href={url} label="Pay" displayName={displayName} />
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm">
            <span style={{ color: "var(--color-muted)" }}>Status: </span>
            <strong style={{ color: plusOneNeedsPayment || data.rsvp!.paymentStatus === "pending" || data.rsvp!.paymentStatus === "unpaid" ? "var(--color-warning)" : data.rsvp!.paymentStatus === "paid" ? "var(--color-success)" : "var(--color-muted)" }}>
              {plusOneNeedsPayment
                ? data.plusOne!.paymentStatus === "pending"
                  ? "+1 payment pending review"
                  : "+1 unpaid — organizer will confirm when received"
                : data.rsvp!.paymentStatus === "paid"
                  ? "Paid"
                  : data.rsvp!.paymentStatus === "waived"
                    ? "Waived"
                    : data.rsvp!.paymentStatus === "pending"
                      ? "Payment pending review"
                      : "Unpaid — organizer will confirm when received"}
            </strong>
          </p>
        </div>
      ) : null}

      <AppLink
        href={`/events/${slug}`}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
        style={{
          background: "var(--color-surface-hover)",
          border: "1px solid var(--color-surface-border)",
          color: "var(--color-foreground)",
        }}
      >
        Back to event
      </AppLink>
    </div>
  );
}

function RsvpForm({
  data,
  slug,
  action,
  adminBypass,
  spotsLeft,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getRsvpPageData>>>;
  slug: string;
  action: (formData: FormData) => Promise<void>;
  adminBypass: boolean;
  spotsLeft: number;
}) {
  return (
    <form action={action} className="mt-8 grid gap-8">
      <input type="hidden" name="eventId" value={data.event.id} />
      <input type="hidden" name="returnTo" value={`/events/${slug}`} />
      {data.survey ? (
        <input type="hidden" name="surveyId" value={data.survey.id} />
      ) : null}

      {data.event.priceCents !== null ? (
        <Section title="Pricing">
          <p className="text-lg font-semibold">
            {formatPrice(data.event.priceCents, data.event.currency)}
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-muted)" }}>per person</span>
          </p>
          {data.event.refundPolicyText ? (
            <div className="mt-2">
              <RichText>{data.event.refundPolicyText}</RichText>
            </div>
          ) : null}
        </Section>
      ) : null}

      {data.event.rulesText || data.event.termsText ? (
        <Section title="Policies">
          <div className="grid gap-4">
            {data.event.rulesText ? (
              <TextBlock title="Rules" body={data.event.rulesText} />
            ) : null}
            {data.event.termsText ? (
              <TextBlock title="Terms" body={data.event.termsText} />
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section title="Plus one">
        {spotsLeft < 2 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Only 1 spot remaining - plus ones not available.
          </p>
        ) : (
          <>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Bringing a partner or someone you live with that isn&apos;t in the group? Add them here! This will double your total.
            </p>
            <input
              name="plusOneName"
              type="text"
              placeholder="Plus one's name (optional)"
              className="mt-3 h-11 w-full rounded-xl px-4 text-sm outline-none"
              style={{
                background: "var(--color-surface-hover)",
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            />
          </>
        )}
      </Section>

      {data.survey && data.survey.schema.questions.length > 0 ? (
        <Section title={data.survey.title}>
          <div className="grid gap-4">
            {data.survey.schema.questions.map((question) => (
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
                    className="h-11 rounded-xl px-4 text-sm outline-none"
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
                    rows={2}
                    className="min-h-16 rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: "var(--color-surface-hover)",
                      border: "1px solid var(--color-surface-border)",
                      color: "var(--color-foreground)",
                    }}
                  />
                )}
              </label>
            ))}
          </div>
        </Section>
      ) : null}

      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--color-surface-border)" }}>
        {adminBypass ? (
          <p className="text-sm" style={{ color: "var(--color-warning)" }}>
            Early RSVP
          </p>
        ) : null}
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          By registering you confirm that you&apos;ve read and agree to the event policies
          {data.event.termsText ? " and terms" : ""}.
        </p>
        <button
          type="submit"
          className="mt-4 h-11 w-full rounded-xl px-5 text-sm font-semibold transition sm:w-auto"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Confirm RSVP
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-lg rounded-2xl p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-2">
        <RichText>{body}</RichText>
      </div>
    </section>
  );
}
