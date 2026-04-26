"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  count,
  eq,
  eventStatuses,
  eventTypes,
  events,
  getDb,
  rsvps,
  type EventStatus,
  type EventType,
  type RsvpStatus,
} from "@arf/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";

export async function createEventAction(formData: FormData) {
  await requireAdminMember();
  const db = getDb();

  await db.insert(events).values(parseEventForm(formData));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

export async function updateEventAction(formData: FormData) {
  await requireAdminMember();
  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect("/admin");
  }

  const db = getDb();
  await db
    .update(events)
    .set({ ...parseEventForm(formData), updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

export async function rsvpForEventAction(formData: FormData) {
  const member = await requireCurrentMember();

  if (member.groupStatus !== "member") {
    redirect("/dashboard");
  }

  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect("/dashboard");
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
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "confirmed")));
    const confirmedCount = Number(confirmedRows[0]?.total ?? 0);
    const nextStatus: RsvpStatus =
      confirmedCount < event.capacity ? "confirmed" : "waitlisted";

    if (currentRsvp) {
      await tx
        .update(rsvps)
        .set({ status: nextStatus, updatedAt: new Date() })
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
  revalidatePath("/admin");
  redirect("/dashboard");
}

export async function cancelRsvpAction(formData: FormData) {
  const member = await requireCurrentMember();
  const eventId = readText(formData, "eventId");

  if (!eventId || member.groupStatus !== "member") {
    redirect("/dashboard");
  }

  const db = getDb();
  await db
    .update(rsvps)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
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
    .set({ status, updatedAt: new Date() })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin");
}

function parseEventForm(formData: FormData) {
  const title = readText(formData, "title");
  const slug = slugify(readText(formData, "slug") || title);

  return {
    type: readEnum(formData, "type", eventTypes) satisfies EventType,
    title,
    slug,
    startsAt: readDate(formData, "startsAt"),
    endsAt: readOptionalDate(formData, "endsAt"),
    locationText: readOptionalText(formData, "locationText"),
    capacity: readCapacity(formData),
    status: readEnum(formData, "status", eventStatuses) satisfies EventStatus,
    hiEventsEventId: readOptionalText(formData, "hiEventsEventId"),
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
