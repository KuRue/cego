import {
  createDraftEventAction,
  deleteEventAction,
  undeleteEventAction,
  updateEventAction,
} from "@/lib/event-actions";
import AppLink from "@/components/app-link";
import { getAdminEvents, getAdminDeletedEvents, type AdminEventWithRsvps } from "@/lib/events";
import { requireAdminMember } from "@/lib/session";
import { getDb, members } from "@cego/db";
import { asc } from "@cego/db";
import Navbar from "@/components/navbar";
import { Badge, StatusBadge, titleCase } from "@/components/badge";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import { utcToDateTimeLocal } from "@/lib/tz";
import { formatDateRange as fmtDateRange } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import Image from "next/image";
import EventImageUpload from "./image-upload";
import GalleryUpload from "./gallery-upload";
import ConfirmButton from "@/components/confirm-button";
import PaymentMethodsEditor from "@/components/payment-methods-editor";
import Field from "@/components/field";
import AutoTextarea from "@/components/auto-textarea";

function parseGalleryImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ event_error?: string }>;
}) {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();
  const params = searchParams ? await searchParams : {};
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
          {params.event_error === "update_failed" ? (
            <div
              className="rounded-2xl p-4 text-sm"
              style={{
                background: "var(--color-danger-bg)",
                color: "var(--color-danger)",
              }}
            >
              Event could not be saved. Check the app logs for the event update error.
            </div>
          ) : null}
          {eventOverviews.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <p className="font-medium">No events yet</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Create the first event to start.
              </p>
            </div>
          ) : (
            eventOverviews.map((overview) => (
              <EventRow key={overview.event.id} overview={overview} eventTypes={settings.eventTypes} allMembers={allMembers} timezone={settings.timezone} />
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
                <EventRow key={overview.event.id} overview={overview} eventTypes={settings.eventTypes} allMembers={allMembers} timezone={settings.timezone} />
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
    <form action={createDraftEventAction} className="inline-block">
      <input type="hidden" name="type" value={defaultType} />
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

function EventRow({ overview, eventTypes, allMembers, timezone }: { overview: AdminEventWithRsvps; eventTypes: string[]; allMembers: { id: string; telegramDisplayName: string }[]; timezone: string }) {
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
            {fmtDateRange(event.startsAt, event.endsAt, timezone)}
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
    {event.status === "deleted" ? (
    <form action={undeleteEventAction} className="ml-2">
      <input type="hidden" name="eventId" value={event.id} />
      <button
        type="submit"
        className="h-8 rounded-lg px-3 text-xs font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        Undelete
      </button>
    </form>
    ) : event.status === "archived" ? (
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
        <EventForm action={updateEventAction} submitLabel="Save event" event={event} eventTypes={eventTypes} allMembers={allMembers} timezone={timezone} />
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{m.telegramDisplayName}</p>
                        <StatusBadge status={rsvp.status} />
                        {rsvp.paymentStatus && rsvp.paymentStatus !== "unpaid" ? (
                          <Badge>{rsvp.paymentStatus}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                        {m.telegramUsername ? `@${m.telegramUsername}` : m.email || m.groupStatus}
                      </p>
                      {plusOneRows.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {plusOneRows.map((po) => (
                            <span key={po.rsvp.id} className="flex items-center gap-1 text-sm" style={{ color: "var(--color-muted)" }}>
                              +1: {po.rsvp.plusOneName}
                              <StatusBadge status={po.rsvp.status} />
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              <AppLink
                href={`/admin/events/${event.id}`}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                Manage RSVPs
              </AppLink>
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
  timezone,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  event?: AdminEventWithRsvps["event"];
  eventTypes?: string[];
  allMembers?: { id: string; telegramDisplayName: string }[];
  timezone: string;
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
          <option value="show">Published</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        </Field>
      </div>
      <Field label="Title">
        <input name="title" required defaultValue={event?.title} className="form-input" />
      </Field>
      <Field label="Description">
        <AutoTextarea name="description" defaultValue={event?.description ?? ""} className="form-textarea" />
      </Field>
      <Field label="Details">
        <AutoTextarea name="details" defaultValue={event?.details ?? ""} className="form-textarea" placeholder="Venue details, activities, parking notes..." />
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
          <input name="startsAt" required type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.startsAt, timezone) : ""} className="form-input" />
        </Field>
        <Field label="Ends">
          <input name="endsAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.endsAt, timezone) : ""} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="RSVP opens">
          <input name="rsvpOpensAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.rsvpOpensAt, timezone) : ""} className="form-input" />
        </Field>
        <Field label="RSVP deadline">
          <input name="rsvpClosesAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.rsvpClosesAt, timezone) : ""} className="form-input" />
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
      <Field label="Gallery images">
        <GalleryUpload initial={parseGalleryImages(event?.galleryImages)} />
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
        <Field label="Initial payment deadline">
          <input
            name="paymentDueDate"
            type="datetime-local"
            defaultValue={event?.paymentDueDate ? toDateTimeLocalValue(event.paymentDueDate, timezone) : ""}
            className="form-input"
          />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Rules">
          <AutoTextarea name="rulesText" defaultValue={event?.rulesText ?? ""} className="form-textarea" />
        </Field>
        <Field label="Terms">
          <AutoTextarea name="termsText" defaultValue={event?.termsText ?? ""} className="form-textarea" />
        </Field>
      </div>
      <Field label="Cancellation/refund policy">
        <AutoTextarea name="refundPolicyText" defaultValue={event?.refundPolicyText ?? ""} className="form-textarea" />
      </Field>
      <Field label="Organizer notes">
        <AutoTextarea name="organizerNotes" defaultValue={event?.organizerNotes ?? ""} className="form-textarea" />
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

function toDateTimeLocalValue(date: Date | null, tz: string): string {
  if (!date) return "";
  return utcToDateTimeLocal(date, tz);
}
