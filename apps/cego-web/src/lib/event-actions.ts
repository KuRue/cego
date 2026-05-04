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
  surveyResponses,
  surveys,
  type EventStatus,
  type RsvpStatus,
} from "@cego/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";
import { parseSurveySchema } from "@/lib/surveys";
import { getEffectiveRsvpStatus } from "@/lib/events";

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
  const plusOneName = readOptionalText(formData, "plusOneName")?.trim() || null;
  const surveyId = readOptionalText(formData, "surveyId");

  if (!eventId) {
    redirect(returnTo);
  }

  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      const event = eventRows[0];

      if (!event) {
        return;
      }

      const confirmedCheck = await tx
        .select({ total: count() })
        .from(rsvps)
        .where(
          and(
            eq(rsvps.eventId, eventId),
            inArray(rsvps.status, capacityBearingStatuses),
          ),
        );
      const confirmedCountNow = Number(confirmedCheck[0]?.total ?? 0);

      const effective = getEffectiveRsvpStatus({
        status: event.status,
        startsAt: event.startsAt,
        rsvpOpensAt: event.rsvpOpensAt,
        rsvpClosesAt: event.rsvpClosesAt,
        capacity: event.capacity,
        confirmedCount: confirmedCountNow,
      });

      if (effective !== "open" && effective !== "full") {
        return;
      }

      const currentRsvpRows = await tx
        .select()
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));
      const hasActiveRsvp = currentRsvpRows.some(
        (r) => r.status !== "cancelled" && !r.parentRsvpId,
      );

      if (hasActiveRsvp) {
        return;
      }

      const needed = plusOneName ? 2 : 1;

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
      const slotsLeft = event.capacity - confirmedCount;

      const parentStatus: RsvpStatus =
        slotsLeft >= needed ? "confirmed" : slotsLeft >= 1 ? "confirmed" : "waitlisted";
      const plusOneStatus: RsvpStatus =
        slotsLeft >= needed ? "confirmed" : "waitlisted";

      const cancelledRsvp = currentRsvpRows.find(
        (r) => r.status === "cancelled" && !r.parentRsvpId,
      );

      let parentRsvpId: string;

      if (cancelledRsvp) {
        await tx
          .update(rsvps)
          .set({
            status: parentStatus,
            ticketType: null,
            checkedInAt: null,
            plusOneName: null,
            parentRsvpId: null,
            updatedAt: new Date(),
          })
          .where(eq(rsvps.id, cancelledRsvp.id));
        parentRsvpId = cancelledRsvp.id;
      } else {
        const [inserted] = await tx
          .insert(rsvps)
          .values({
            memberId: member.id,
            eventId,
            status: parentStatus,
            paymentStatus: "unpaid",
          })
          .returning({ id: rsvps.id });
        parentRsvpId = inserted.id;
      }

      if (plusOneName) {
        const cancelledPlusOne = currentRsvpRows.find(
          (r) => r.status === "cancelled" && r.parentRsvpId,
        );

        if (cancelledPlusOne) {
          await tx
            .update(rsvps)
            .set({
              status: plusOneStatus,
              plusOneName,
              parentRsvpId,
              updatedAt: new Date(),
            })
            .where(eq(rsvps.id, cancelledPlusOne.id));
        } else {
          await tx.insert(rsvps).values({
            memberId: member.id,
            eventId,
            status: plusOneStatus,
            plusOneName,
            parentRsvpId,
            paymentStatus: "unpaid",
          });
        }
      }

      if (surveyId) {
        const surveyRows = await tx
          .select()
          .from(surveys)
          .where(and(eq(surveys.id, surveyId), eq(surveys.status, "published")))
          .limit(1);
        const survey = surveyRows[0];

        if (survey) {
          const schema = parseSurveySchema(survey.schemaJson);
          const answers = Object.fromEntries(
            schema.questions.map((q) => [
              q.id,
              readText(formData, `answer:${q.id}`),
            ]),
          );

          await tx
            .insert(surveyResponses)
            .values({
              surveyId: survey.id,
              memberId: member.id,
              eventId,
              answersJson: answers,
            })
            .onConflictDoUpdate({
              target: [surveyResponses.surveyId, surveyResponses.memberId],
              set: {
                answersJson: answers,
                updatedAt: new Date(),
              },
            });
        }
      }
    });
  } catch (err) {
    console.error("RSVP action failed:", err);
    redirect(returnTo + "?rsvp_error=1");
  }

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

  await db.transaction(async (tx) => {
    const memberRsvps = await tx
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));

    const parentRsvp = memberRsvps.find((r) => !r.parentRsvpId);
    if (!parentRsvp || parentRsvp.status === "cancelled") return;

    const now = new Date();

    await tx
      .update(rsvps)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(rsvps.id, parentRsvp.id));

    await tx
      .update(rsvps)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(rsvps.parentRsvpId, parentRsvp.id));
  });

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

export async function updateRsvpPaymentAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const paymentStatus = readEnum(formData, "paymentStatus", [
    "unpaid",
    "paid",
    "waived",
  ] as const);

  if (!rsvpId) {
    redirect("/admin/events");
  }

  const db = getDb();

  await db
    .update(rsvps)
    .set({
      paymentStatus,
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
    paymentMethods: readOptionalText(formData, "paymentMethods"),
    paymentDueDate: readOptionalDate(formData, "paymentDueDate"),
    rulesText: readOptionalText(formData, "rulesText"),
    termsText: readOptionalText(formData, "termsText"),
    refundPolicyText: readOptionalText(formData, "refundPolicyText"),
    organizerNotes: readOptionalText(formData, "organizerNotes"),
    imageUrl: readOptionalText(formData, "imageUrl"),
    capacity: readCapacity(formData),
    rsvpOpensAt: readOptionalDate(formData, "rsvpOpensAt"),
    rsvpClosesAt: readOptionalDate(formData, "rsvpClosesAt"),
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
