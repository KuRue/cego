import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
  updateRsvpPaymentAction,
  updateRsvpStatusAction,
} from "@/lib/event-actions";
import AppLink from "@/components/app-link";
import { getAdminEvents, getAdminDeletedEvents, type AdminEventWithRsvps } from "@/lib/events";
import { requireAdminMember } from "@/lib/session";
import { getDb, members } from "@cego/db";
import { asc } from "@cego/db";
import Navbar from "@/components/navbar";
import { Badge, StatusBadge, titleCase } from "@/components/badge";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import Image from "next/image";
import EventImageUpload from "./image-upload";
import { Suspense } from "react";
import ConfirmButton from "@/components/confirm-button";
import PaymentMethodsEditor from "@/components/payment-methods-editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

export default async function AdminEventsPage() {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();
  const eventOverviews = await getAdminEvents();
  const deletedEvents = await getAdminDeletedEvents();
  const db = getDb();
  const allMembers = await db
    .select({ id: members.id, telegramDisplayName: members.telegramDisplayName })
    .from(members)
    .orderBy(asc(members.telegramDisplayName));

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
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <AppLink
              href="/admin"
              className="text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              &larr; Admin
            </AppLink>
            <h1 className="mt-1 text-3xl font-semibold">Events</h1>
          </div>
          <CreateEventButton defaultType={settings.eventTypes[0] ?? "meet"} />
        </div>

        <div className="mt-8 grid gap-5">
          {eventOverviews.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <p className="font-medium">No events yet</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Create the first event to start.
              </p>
            </div>
          ) : (
            eventOverviews.map((overview) => (
              <EventRow key={overview.event.id} overview={overview} eventTypes={settings.eventTypes} allMembers={allMembers} />
            ))
          )}
        </div>

        {deletedEvents.length > 0 ? (
          <details className="mt-10">
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              Show deleted ({deletedEvents.length})
            </summary>
            <div className="mt-5 grid gap-5">
              {deletedEvents.map((overview) => (
                <EventRow key={overview.event.id} overview={overview} eventTypes={settings.eventTypes} allMembers={allMembers} />
              ))}
            </div>
          </details>
        ) : null}
      </main>
    </>
  );
}

function CreateEventButton({ defaultType }: { defaultType: string }) {
  return (
    <form action={createEventAction} className="inline-block">
      <input type="hidden" name="title" value="New event" />
      <input type="hidden" name="slug" value={`event-${Date.now()}`} />
      <input type="hidden" name="type" value={defaultType} />
      <input type="hidden" name="status" value="draft" />
      <input type="hidden" name="capacity" value="12" />
      <input type="hidden" name="startsAt" value={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)} />
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        Create event
      </button>
    </form>
  );
}

function EventRow({ overview, eventTypes, allMembers }: { overview: AdminEventWithRsvps; eventTypes: string[]; allMembers: { id: string; telegramDisplayName: string }[] }) {
  const { event, confirmedCount, waitlistedCount, rsvps } = overview;

  return (
    <article className="glass-lg rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{titleCase(event.type)}</Badge>
            <StatusBadge status={event.status} />
          </div>
          <h2 className="mt-3 text-xl font-semibold">
            <AppLink href={`/admin/events/${event.id}`} style={{ color: "var(--color-foreground)" }}>{event.title}</AppLink>
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {formatDateRange(event.startsAt, event.endsAt)}
          </p>
          {event.locationText ? (
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              {event.locationText}
            </p>
          ) : null}
          <div className="mt-3 flex gap-4 text-sm">
            <span>{confirmedCount}/{event.capacity} confirmed</span>
            {waitlistedCount > 0 ? <span>{waitlistedCount} waitlisted</span> : null}
            {event.priceCents !== null ? (
              <span>{formatPrice(event.priceCents, event.currency)}</span>
            ) : null}
          </div>
        </div>
    <span className="text-sm" style={{ color: "var(--color-muted)" }}>
      {rsvps.length} RSVP{rsvps.length === 1 ? "" : "s"}
    </span>
    {event.status === "archived" ? (
    <form action={deleteEventAction} className="ml-2">
      <input type="hidden" name="eventId" value={event.id} />
      <ConfirmButton
        type="submit"
        message="Delete this event and all its RSVPs? This cannot be undone."
        className="h-8 rounded-lg px-3 text-xs font-semibold transition"
        style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
      >
        Delete
      </ConfirmButton>
    </form>
    ) : null}
      </div>

      <details className="mt-5 pt-5" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
          Edit event
        </summary>
        <EventForm action={updateEventAction} submitLabel="Save event" event={event} eventTypes={eventTypes} allMembers={allMembers} />
      </details>

      {rsvps.length > 0 ? (
          <details className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
              RSVPs ({rsvps.filter((r) => !r.rsvp.parentRsvpId).length})
            </summary>
            <div className="mt-4 grid gap-3">
              {rsvps
                .filter(({ rsvp }) => !rsvp.parentRsvpId)
                .map(({ rsvp, member: m }) => {
                  const plusOneRows = rsvps.filter(
                    (r) => r.rsvp.parentRsvpId === rsvp.id,
                  );
                  return (
                    <div key={rsvp.id} className="glass rounded-xl p-4">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div>
                          <p className="font-medium">{m.telegramDisplayName}</p>
                          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                            {m.telegramUsername ? `@${m.telegramUsername}` : m.email || m.groupStatus}
                          </p>
                          <StatusBadge status={rsvp.status} />
                        </div>
                        <form action={updateRsvpStatusAction} className="flex gap-2">
                          <input type="hidden" name="rsvpId" value={rsvp.id} />
                          <select
                            name="status"
                            defaultValue={rsvp.status}
                            className="h-10 rounded-xl px-3 text-sm outline-none"
                            style={{
                              background: "var(--color-surface-hover)",
                              border: "1px solid var(--color-surface-border)",
                            }}
                          >
                            <option value="pending_payment">pending payment</option>
                            <option value="confirmed">confirmed</option>
                            <option value="waitlisted">waitlisted</option>
                            <option value="cancelled">cancelled</option>
                            <option value="expired">expired</option>
                          </select>
                          <button
                            type="submit"
                            className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                            style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                          >
                            Update
                          </button>
                        </form>
                        {event.paymentRequired ? (
                          <form action={updateRsvpPaymentAction} className="flex gap-2">
                            <input type="hidden" name="rsvpId" value={rsvp.id} />
                            <select
                              name="paymentStatus"
                              defaultValue={rsvp.paymentStatus ?? "unpaid"}
                              className="h-10 rounded-xl px-3 text-sm outline-none"
                              style={{
                                background: "var(--color-surface-hover)",
                                border: "1px solid var(--color-surface-border)",
                              }}
                            >
                              <option value="unpaid">unpaid</option>
                              <option value="paid">paid</option>
                              <option value="waived">waived</option>
                            </select>
                            <button
                              type="submit"
                              className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                              style={{ background: "var(--color-highlight)", color: "#1a1d23" }}
                            >
                              Payment
                            </button>
                          </form>
                        ) : null}
                      </div>
                      {plusOneRows.length > 0 ? (
                        <div className="mt-3 rounded-xl p-3" style={{ background: "var(--color-surface-hover)" }}>
                          {plusOneRows.map((po) => (
                            <div key={po.rsvp.id} className="flex flex-wrap items-center gap-2">
                              <span className="text-sm" style={{ color: "var(--color-muted)" }}>+1:</span>
                              <span className="text-sm font-medium">{po.rsvp.plusOneName}</span>
                              <StatusBadge status={po.rsvp.status} />
                              <form action={updateRsvpStatusAction} className="ml-auto flex gap-2">
                                <input type="hidden" name="rsvpId" value={po.rsvp.id} />
                                <select
                                  name="status"
                                  defaultValue={po.rsvp.status}
                                  className="h-8 rounded-lg px-2 text-xs outline-none"
                                  style={{
                                    background: "var(--color-background)",
                                    border: "1px solid var(--color-surface-border)",
                                  }}
                                >
                                  <option value="pending_payment">pending payment</option>
                                  <option value="confirmed">confirmed</option>
                                  <option value="waitlisted">waitlisted</option>
                                  <option value="cancelled">cancelled</option>
                                  <option value="expired">expired</option>
                                </select>
                                <button
                                  type="submit"
                                  className="h-8 rounded-lg px-3 text-xs font-semibold transition"
                                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                                >
                                  Update
                                </button>
                              </form>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </details>
      ) : null}
    </article>
  );
}

function EventForm({
  action,
  submitLabel,
  event,
  eventTypes,
  allMembers,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  event?: AdminEventWithRsvps["event"];
  eventTypes?: string[];
  allMembers?: { id: string; telegramDisplayName: string }[];
}) {
  return (
    <form action={action} className="mt-4 grid gap-4 overflow-hidden">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
        <select name="type" defaultValue={event?.type ?? (eventTypes?.[0] ?? "meet")} className="form-select">
          {(eventTypes ?? ["meet"]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
        <select name="status" defaultValue={event?.status ?? "draft"} className="form-select">
          <option value="draft">Draft</option>
          <option value="show">Show</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        </Field>
      </div>
      <Field label="Title">
        <input name="title" required defaultValue={event?.title} className="form-input" />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={event?.description ?? ""} rows={4} className="form-textarea" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Slug">
          <input name="slug" required defaultValue={event?.slug} className="form-input" />
        </Field>
        <Field label="Capacity">
          <input name="capacity" required type="number" min="1" defaultValue={event?.capacity ?? 12} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts">
          <input name="startsAt" required type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.startsAt) : ""} className="form-input" />
        </Field>
        <Field label="Ends">
          <input name="endsAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.endsAt) : ""} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="RSVP opens">
          <input name="rsvpOpensAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.rsvpOpensAt) : ""} className="form-input" />
        </Field>
        <Field label="RSVP closes">
          <input name="rsvpClosesAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.rsvpClosesAt) : ""} className="form-input" />
        </Field>
      </div>
      <Field label="Location">
        <input name="locationText" defaultValue={event?.locationText ?? ""} className="form-input" placeholder="General area (shown to everyone)" />
      </Field>
      <Field label="Address">
        <input name="addressText" defaultValue={event?.addressText ?? ""} className="form-input" placeholder="Exact address (shown after confirmed & paid)" />
      </Field>
      <Field label="Cover photo">
        <div className="mt-1 flex flex-col gap-3">
          {event?.imageUrl ? (
            <div className="flex items-center gap-3">
              <Image
                src={event.imageUrl}
                alt="Cover"
                width={80}
                height={45}
                className="h-11 w-20 rounded-lg object-cover"
                style={{ border: "1px solid var(--color-surface-border)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>Current cover</span>
            </div>
          ) : null}
          <EventImageUpload currentUrl={event?.imageUrl ?? null} />
          <input type="hidden" name="imageUrl" defaultValue={event?.imageUrl ?? ""} />
        </div>
      </Field>
      <Field label="Promo image">
        <div className="mt-1 flex flex-col gap-3">
          {event?.promoImageUrl ? (
            <div className="flex items-center gap-3">
              <Image
                src={event.promoImageUrl}
                alt="Promo"
                width={80}
                height={45}
                className="h-11 w-20 rounded-lg object-cover"
                style={{ border: "1px solid var(--color-surface-border)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>Current promo</span>
            </div>
          ) : null}
          <EventImageUpload currentUrl={event?.promoImageUrl ?? null} fieldName="promoImageUrl" />
          <input type="hidden" name="promoImageUrl" defaultValue={event?.promoImageUrl ?? ""} />
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_auto]">
        <Field label="Price">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={event?.priceCents !== null && event?.priceCents !== undefined ? (event.priceCents / 100).toFixed(2) : ""}
            className="form-input"
          />
        </Field>
        <Field label="Currency">
          <input name="currency" maxLength={3} defaultValue={event?.currency ?? "USD"} className="form-input uppercase" />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input name="paymentRequired" type="checkbox" defaultChecked={event?.paymentRequired ?? false} className="h-4 w-4" />
          <span className="font-medium">Payment required</span>
        </label>
      </div>
      <Field label="Payment methods">
        <PaymentMethodsEditor name="paymentMethods" defaultValue={event?.paymentMethods ?? null} />
      </Field>
      <Field label="Payment notification recipient">
        <select name="paymentNotifyMemberId" defaultValue={event?.paymentNotifyMemberId ?? ""} className="form-select">
          <option value="">None</option>
          {allMembers?.map((m) => (
            <option key={m.id} value={m.id}>{m.telegramDisplayName}</option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input name="qrCheckInEnabled" type="checkbox" defaultChecked={event?.qrCheckInEnabled ?? false} className="h-4 w-4" />
        <span className="font-medium">QR check-in</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment due date">
          <input
            name="paymentDueDate"
            type="datetime-local"
            defaultValue={event?.paymentDueDate ? toDateTimeLocalValue(event.paymentDueDate) : ""}
            className="form-input"
          />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Rules">
          <textarea name="rulesText" defaultValue={event?.rulesText ?? ""} rows={4} className="form-textarea" />
        </Field>
        <Field label="Terms">
          <textarea name="termsText" defaultValue={event?.termsText ?? ""} rows={4} className="form-textarea" />
        </Field>
      </div>
      <Field label="Cancellation/refund policy">
        <textarea name="refundPolicyText" defaultValue={event?.refundPolicyText ?? ""} rows={3} className="form-textarea" />
      </Field>
      <Field label="Organizer notes">
        <textarea name="organizerNotes" defaultValue={event?.organizerNotes ?? ""} rows={3} className="form-textarea" />
      </Field>
      <button
        type="submit"
        className="h-11 rounded-xl px-5 text-sm font-semibold transition sm:w-fit"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        {submitLabel}
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

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
