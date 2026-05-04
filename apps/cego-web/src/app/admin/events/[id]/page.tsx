import {
  updateEventAction,
  deleteEventAction,
  addEventExpenseAction,
  deleteEventExpenseAction,
} from "@/lib/event-actions";
import AppLink from "@/components/app-link";
import { getAdminEventDetail } from "@/lib/events";
import { requireAdminMember } from "@/lib/session";
import Navbar from "@/components/navbar";
import { StatusBadge, titleCase } from "@/components/badge";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import Image from "next/image";
import EventImageUpload from "../image-upload";
import ConfirmButton from "@/components/confirm-button";
import AdminRsvpManager from "@/components/admin-rsvp-manager";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Detail",
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();
  const { id } = await params;
  const detail = await getAdminEventDetail(id);

  if (!detail) notFound();

  const returnTo = `/admin/events/${detail.event.id}`;

  const activeRsvps = detail.rsvps.filter(
    (r) => r.rsvp.status !== "cancelled",
  );
  const paidCount = activeRsvps.filter(
    (r) => r.rsvp.paymentStatus === "paid" || r.rsvp.paymentStatus === "waived",
  ).length;
  const checkedInCount = activeRsvps.filter(
    (r) => r.rsvp.checkedInAt !== null,
  ).length;

  const totalOwed = activeRsvps.reduce((sum, r) => {
    if (detail.event.priceCents === null) return sum;
    const price = detail.event.priceCents;
    const plusOneCount = r.plusOne.filter((p) => p.status !== "cancelled").length;
    return sum + price * (1 + plusOneCount);
  }, 0);

  const totalPaid = activeRsvps.reduce((sum, r) => {
    if (detail.event.priceCents === null || r.rsvp.paymentStatus === "unpaid") return sum;
    const price = detail.event.priceCents;
    const plusOneCount = r.plusOne.filter((p) => p.status !== "cancelled").length;
    const multiplier = r.rsvp.paymentStatus === "waived" ? 0 : 1;
    return sum + price * (1 + plusOneCount) * multiplier;
  }, 0);

  const expenseTotal = detail.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const manualCosts = detail.event.costCents ?? 0;
  const totalCosts = expenseTotal + manualCosts;
  const netBalance = totalPaid - totalCosts;

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
      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 pb-16 pt-8">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <AppLink
                href="/admin/events"
                className="text-sm font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                &larr; Events
              </AppLink>
              <h1 className="mt-1 font-title text-2xl font-semibold sm:text-3xl">{detail.event.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={detail.event.status} />
              <form action={deleteEventAction} className="hidden sm:block">
                <input type="hidden" name="eventId" value={detail.event.id} />
                <ConfirmButton
                  type="submit"
                  message="Delete this event and all its RSVPs? This cannot be undone."
                  className="h-8 rounded-lg px-3 text-xs font-semibold transition"
                  style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>

          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            {titleCase(detail.event.type)} · {formatDateRange(detail.event.startsAt, detail.event.endsAt)} · {detail.event.locationText ?? "No location"}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 grid gap-6">
            <section className="glass-lg rounded-2xl p-5">
              <h2 className="text-lg font-semibold">Stats</h2>
              <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                <StatBox label="Confirmed" value={`${detail.confirmedCount}/${detail.event.capacity}`} />
                <StatBox label="Waitlisted" value={String(detail.waitlistedCount)} />
                <StatBox label="Checked In" value={String(checkedInCount)} />
                <StatBox label="Paid" value={`${paidCount}/${activeRsvps.length}`} />
              </div>

              {detail.event.priceCents !== null || totalCosts > 0 ? (
                <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <StatBox label="Total Costs" value={formatPrice(totalCosts)} />
                  <StatBox label="Total Owed" value={formatPrice(totalOwed)} />
                  <StatBox label="Total Paid" value={formatPrice(totalPaid)} />
                  <StatBox
                    label="Net Balance"
                    value={formatPrice(Math.abs(netBalance))}
                    suffix={netBalance >= 0 ? " surplus" : " short"}
                    highlight={netBalance < 0 ? "bad" : netBalance > 0 ? "good" : undefined}
                  />
                </div>
              ) : null}
            </section>

            <section className="glass-lg rounded-2xl p-5">
              <h2 className="text-lg font-semibold">Expenses</h2>
              {detail.expenses.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {detail.expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--color-surface-hover)" }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs" style={{ color: "var(--color-muted)" }}>{titleCase(expense.category)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatPrice(expense.amountCents)}</span>
                        <form action={deleteEventExpenseAction}>
                          <input type="hidden" name="expenseId" value={expense.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            type="submit"
                            className="text-xs transition"
                            style={{ color: "var(--color-danger)" }}
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl p-3" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
                    <span className="text-sm font-semibold">Total expenses</span>
                    <span className="text-sm font-bold">{formatPrice(expenseTotal)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>No expenses logged yet.</p>
              )}
              <form action={addEventExpenseAction} className="mt-4 grid gap-3 grid-cols-[1fr_auto] sm:grid-cols-[1fr_8rem_7rem_auto]">
                <input type="hidden" name="eventId" value={detail.event.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  name="description"
                  required
                  placeholder="Description (e.g. Groceries)"
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
                />
                <select
                  name="category"
                  className="h-10 rounded-xl px-3 text-sm outline-none"
                  style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
                >
                  <option value="food">Food</option>
                  <option value="supplies">Supplies</option>
                  <option value="venue">Venue</option>
                  <option value="transport">Transport</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="amount"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  className="h-10 rounded-xl px-4 text-sm outline-none"
                  style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-surface-border)" }}
                />
                <button
                  type="submit"
                  className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  Add
                </button>
              </form>
            </section>

            {detail.rsvps.length > 0 ? (
              <section className="glass-lg rounded-2xl p-5">
                <h2 className="text-lg font-semibold">
                  RSVPs ({activeRsvps.length})
                </h2>
                <div className="mt-4">
                  <AdminRsvpManager
                    rsvps={detail.rsvps}
                    eventId={detail.event.id}
                    paymentRequired={detail.event.paymentRequired ?? false}
                    survey={detail.survey ?? null}
                  />
                </div>
              </section>
            ) : (
              <div className="glass-lg rounded-2xl p-8 text-center">
                <p className="font-medium">No RSVPs yet</p>
              </div>
            )}
          </div>

          <aside className="glass-lg h-fit min-w-0 rounded-2xl p-5 lg:sticky lg:top-24">
            <details>
              <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
                Edit event
              </summary>
              <EventForm action={updateEventAction} event={detail.event} eventTypes={settings.eventTypes} />
            </details>
            <form action={deleteEventAction} className="mt-4 sm:hidden">
              <input type="hidden" name="eventId" value={detail.event.id} />
              <ConfirmButton
                type="submit"
                message="Delete this event and all its RSVPs? This cannot be undone."
                className="h-9 w-full rounded-xl px-3 text-sm font-semibold transition"
                style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
              >
                Delete event
              </ConfirmButton>
            </form>
          </aside>
        </div>
      </main>
    </>
  );
}

function StatBox({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: "good" | "bad" }) {
  const color = highlight === "good" ? "var(--color-success)" : highlight === "bad" ? "var(--color-danger)" : "var(--color-foreground)";
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--color-surface-hover)" }}>
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color }}>
        {value}{suffix && <span className="text-xs font-normal">{suffix}</span>}
      </p>
    </div>
  );
}

function EventForm({
  action,
  event,
  eventTypes,
}: {
  action: (formData: FormData) => Promise<void>;
  event: import("@cego/db").Event;
  eventTypes?: string[];
}) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      <input type="hidden" name="eventId" value={event.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select name="type" defaultValue={event.type} className="form-select">
            {(eventTypes ?? ["meet"]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={event.status} className="form-select">
            <option value="draft">Draft</option>
            <option value="show">Show</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>
      <Field label="Title">
        <input name="title" required defaultValue={event.title} className="form-input" />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={event.description ?? ""} rows={3} className="form-textarea" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Slug">
          <input name="slug" required defaultValue={event.slug} className="form-input" />
        </Field>
        <Field label="Capacity">
          <input name="capacity" required type="number" min="1" defaultValue={event.capacity} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts">
          <input name="startsAt" required type="datetime-local" defaultValue={toDateTimeLocalValue(event.startsAt)} className="form-input" />
        </Field>
        <Field label="Ends">
          <input name="endsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(event.endsAt)} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="RSVP opens">
          <input name="rsvpOpensAt" type="datetime-local" defaultValue={toDateTimeLocalValue(event.rsvpOpensAt)} className="form-input" />
        </Field>
        <Field label="RSVP closes">
          <input name="rsvpClosesAt" type="datetime-local" defaultValue={toDateTimeLocalValue(event.rsvpClosesAt)} className="form-input" />
        </Field>
      </div>
      <Field label="Location text">
        <input name="locationText" defaultValue={event.locationText ?? ""} className="form-input" />
      </Field>
      <Field label="Cover photo">
        <div className="mt-1 flex flex-col gap-3">
          {event.imageUrl ? (
            <div className="flex items-center gap-3">
              <Image src={event.imageUrl} alt="Cover" width={80} height={45} className="h-11 w-20 rounded-lg object-cover" style={{ border: "1px solid var(--color-surface-border)" }} />
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>Current cover</span>
            </div>
          ) : null}
          <EventImageUpload currentUrl={event.imageUrl ?? null} />
          <input type="hidden" name="imageUrl" defaultValue={event.imageUrl ?? ""} />
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_auto]">
        <Field label="Price">
          <input name="price" type="number" min="0" step="0.01" defaultValue={event.priceCents !== null ? (event.priceCents / 100).toFixed(2) : ""} className="form-input" />
        </Field>
        <Field label="Currency">
          <input name="currency" maxLength={3} defaultValue={event.currency ?? "USD"} className="form-input uppercase" />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input name="paymentRequired" type="checkbox" defaultChecked={event.paymentRequired ?? false} className="h-4 w-4" />
          <span className="font-medium">Payment required</span>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Other costs">
          <input name="cost" type="number" min="0" step="0.01" defaultValue={event.costCents !== null ? (event.costCents / 100).toFixed(2) : ""} className="form-input" />
        </Field>
        <Field label="Payment due date">
          <input name="paymentDueDate" type="datetime-local" defaultValue={event.paymentDueDate ? toDateTimeLocalValue(event.paymentDueDate) : ""} className="form-input" />
        </Field>
      </div>
      <Field label="Payment methods">
        <textarea name="paymentMethods" defaultValue={event.paymentMethods ?? ""} rows={3} placeholder="e.g. Venmo: @username&#10;Zelle: email@example.com" className="form-textarea" />
      </Field>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Rules">
          <textarea name="rulesText" defaultValue={event.rulesText ?? ""} rows={3} className="form-textarea" />
        </Field>
        <Field label="Terms">
          <textarea name="termsText" defaultValue={event.termsText ?? ""} rows={3} className="form-textarea" />
        </Field>
      </div>
      <Field label="Cancellation/refund policy">
        <textarea name="refundPolicyText" defaultValue={event.refundPolicyText ?? ""} rows={2} className="form-textarea" />
      </Field>
      <Field label="Organizer notes">
        <textarea name="organizerNotes" defaultValue={event.organizerNotes ?? ""} rows={2} className="form-textarea" />
      </Field>
      <button
        type="submit"
        className="h-11 rounded-xl px-5 text-sm font-semibold transition sm:w-fit"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        Save event
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
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
  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}
