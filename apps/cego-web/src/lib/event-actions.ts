"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  count,
  eq,
  eventStatuses,
  events,
  getDb,
  inArray,
  rsvps,
  type EventStatus,
  type RsvpStatus,
} from "@cego/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";

const capacityBearingStatuses = ["confirmed"] as const;

export async function createEventAction(formData: FormData) {
  await requireAdminMember();
  const db = getDb();

  await db.insert(events).values(parseEventForm(formData));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function updateEventAction(formData: FormData) {
  await requireAdminMember();
  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect("/admin/events");
  }

  const db = getDb();
  await db
    .update(events)
    .set({ ...parseEventForm(formData), updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function rsvpForEventAction(formData: FormData) {
  const member = await requireCurrentMember();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";

  if (member.groupStatus !== "member") {
    redirect(returnTo);
  }

  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect(returnTo);
  }

  const db = getDb();

  await db.transaction(async (tx) => {
    const eventRows = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const event = eventRows[0];

    if (!event || !["open", "full"].includes(event.status)) {
      return;
    }

    const currentRsvpRows = await tx
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)))
      .limit(1);
    const currentRsvp = currentRsvpRows[0];

    if (currentRsvp && currentRsvp.status !== "cancelled") {
      return;
    }

    const confirmedRows = await tx
      .select({ total: count() })
      .from(rsvps)
      .where(
        and(
          eq(rsvps.eventId, eventId),
          inArray(rsvps.status, capacityBearingStatuses),
        ),
      );
    const confirmedCount = Number(confirmedRows[0]?.total ?? 0);
    const nextStatus: RsvpStatus =
      confirmedCount < event.capacity ? "confirmed" : "waitlisted";

    if (currentRsvp) {
      await tx
        .update(rsvps)
        .set({
          status: nextStatus,
          ticketType: null,
          checkedInAt: null,
          updatedAt: new Date(),
        })
        .where(eq(rsvps.id, currentRsvp.id));
      return;
    }

    await tx.insert(rsvps).values({
      memberId: member.id,
      eventId,
      status: nextStatus,
    });
  });

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function cancelRsvpAction(formData: FormData) {
  const member = await requireCurrentMember();
  const eventId = readText(formData, "eventId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";

  if (!eventId || member.groupStatus !== "member") {
    redirect(returnTo);
  }

  const db = getDb();
  await db
    .update(rsvps)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath("/admin");
  redirect(returnTo);
}

export async function updateRsvpStatusAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const status = readEnum(formData, "status", [
    "confirmed",
    "waitlisted",
    "cancelled",
  ] as const);

  if (!rsvpId) {
    redirect("/admin");
  }

  const db = getDb();

  await db
    .update(rsvps)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

function parseEventForm(formData: FormData) {
  const title = readText(formData, "title");
  const slug = slugify(readText(formData, "slug") || title);

  return {
    type: readText(formData, "type") || "local_event",
    title,
    slug,
    description: readOptionalText(formData, "description"),
    startsAt: readDate(formData, "startsAt"),
    endsAt: readOptionalDate(formData, "endsAt"),
    locationText: readOptionalText(formData, "locationText"),
    priceCents: readOptionalPriceCents(formData, "price"),
    currency: readCurrency(formData, "currency"),
    paymentRequired: readCheckbox(formData, "paymentRequired"),
    rulesText: readOptionalText(formData, "rulesText"),
    termsText: readOptionalText(formData, "termsText"),
    refundPolicyText: readOptionalText(formData, "refundPolicyText"),
    organizerNotes: readOptionalText(formData, "organizerNotes"),
    imageUrl: readOptionalText(formData, "imageUrl"),
    capacity: readCapacity(formData),
    status: readEnum(formData, "status", eventStatuses) satisfies EventStatus,
  };
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  return readText(formData, key) || null;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
): T {
  const value = readText(formData, key);

  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${key}.`);
  }

  return value as T;
}

function readDate(formData: FormData, key: string): Date {
  const value = readText(formData, key);
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${key} is required.`);
  }

  return date;
}

function readOptionalDate(formData: FormData, key: string): Date | null {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} is invalid.`);
  }

  return date;
}

function readCapacity(formData: FormData): number {
  const capacity = Number(readText(formData, "capacity"));

  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error("Capacity must be a positive whole number.");
  }

  return capacity;
}

function readOptionalPriceCents(formData: FormData, key: string): number | null {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Price must be zero or greater.");
  }

  return Math.round(amount * 100);
}

function readCurrency(formData: FormData, key: string): string {
  const value = readText(formData, key).toUpperCase();

  if (!/^[A-Z]{3}$/.test(value)) {
    return "USD";
  }

  return value;
}

function readCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function readReturnPath(formData: FormData, key: string): string | null {
  const value = readText(formData, key);

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
