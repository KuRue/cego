"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  and,
  asc,
  count,
  eq,
  eventExpenses,
  eventStatuses,
  events,
  getDb,
  inArray,
  members,
  ne,
  rsvps,
  sql,
  surveyResponses,
  surveys,
  type EventStatus,
  type RsvpStatus,
} from "@cego/db";
import { requireAdminMember, requireCurrentMember } from "@/lib/session";
import { parseSurveySchema } from "@/lib/surveys";
import { getEffectiveRsvpStatus } from "@/lib/events";
import { sendNotification } from "@/lib/notifications";

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

  promoteWaitlist(eventId).catch(() => {});

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
  let rsvpStatus: "confirmed" | "waitlisted" | null = null;

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
        (r) => !["cancelled", "expired"].includes(r.status) && !r.parentRsvpId,
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

      const fitsCapacity = slotsLeft >= needed;
      const activeStatus: RsvpStatus = fitsCapacity ? "confirmed" : "waitlisted";
      const plusOneStatus: RsvpStatus = fitsCapacity ? "confirmed" : "waitlisted";

      rsvpStatus = activeStatus;

      const now = new Date();
      const paymentDeadline = event.paymentRequired
        ? (event.paymentDueDate && event.paymentDueDate.getTime() > now.getTime()
            ? event.paymentDueDate
            : new Date(now.getTime() + 24 * 60 * 60 * 1000))
        : null;

      const cancelledRsvp = currentRsvpRows.find(
        (r) => r.status === "cancelled" && !r.parentRsvpId,
      );

      let parentRsvpId: string;

      if (cancelledRsvp) {
        await tx
          .update(rsvps)
          .set({
            status: activeStatus,
            ticketType: null,
            checkedInAt: null,
            plusOneName: null,
            parentRsvpId: null,
            notes: null,
            tags: sql`ARRAY[]::text[]`,
            paymentStatus: "unpaid",
            paymentDeadlineAt: paymentDeadline,
            updatedAt: now,
          })
          .where(eq(rsvps.id, cancelledRsvp.id));
        parentRsvpId = cancelledRsvp.id;
      } else {
        const expiredRsvp = currentRsvpRows.find(
          (r) => r.status === "expired" && !r.parentRsvpId,
        );
        if (expiredRsvp) {
          await tx
            .update(rsvps)
            .set({
              status: activeStatus,
              ticketType: null,
              checkedInAt: null,
              plusOneName: null,
              parentRsvpId: null,
              notes: null,
              tags: sql`ARRAY[]::text[]`,
              paymentStatus: "unpaid",
              paymentDeadlineAt: paymentDeadline,
              updatedAt: now,
            })
            .where(eq(rsvps.id, expiredRsvp.id));
          parentRsvpId = expiredRsvp.id;
        } else {
          const [inserted] = await tx
            .insert(rsvps)
            .values({
              memberId: member.id,
              eventId,
              status: activeStatus,
              paymentStatus: "unpaid",
              paymentDeadlineAt: paymentDeadline,
            })
            .returning({ id: rsvps.id });
          parentRsvpId = inserted.id;
        }
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
              ticketType: null,
              checkedInAt: null,
              notes: null,
              tags: sql`ARRAY[]::text[]`,
              paymentStatus: "unpaid",
              paymentDeadlineAt: paymentDeadline,
              updatedAt: now,
            })
            .where(eq(rsvps.id, cancelledPlusOne.id));
        } else {
          const expiredPlusOne = currentRsvpRows.find(
            (r) => r.status === "expired" && r.parentRsvpId,
          );
          if (expiredPlusOne) {
            await tx
              .update(rsvps)
              .set({
                status: plusOneStatus,
                plusOneName,
                parentRsvpId,
                ticketType: null,
                checkedInAt: null,
                notes: null,
                tags: sql`ARRAY[]::text[]`,
                paymentStatus: "unpaid",
                paymentDeadlineAt: paymentDeadline,
                updatedAt: now,
              })
              .where(eq(rsvps.id, expiredPlusOne.id));
          } else {
            await tx.insert(rsvps).values({
              memberId: member.id,
              eventId,
              status: plusOneStatus,
              plusOneName,
              parentRsvpId,
              paymentStatus: "unpaid",
              paymentDeadlineAt: paymentDeadline,
            });
          }
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
    if (isNextRedirect(err)) throw err;
    console.error("RSVP action failed:", err);
    redirect(returnTo + "?rsvp_error=1");
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath("/admin");

  if (rsvpStatus) {
    sendNotification({
      memberId: member.id,
      eventId,
      template: rsvpStatus === "confirmed"
        ? "rsvp_confirmed"
        : "rsvp_waitlisted",
    }).catch(() => {});
  }

  redirect(returnTo);
}

export async function adminRsvpForEventAction(formData: FormData) {
  const member = await requireAdminMember();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";
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

      if (!event) return;

      const currentRsvpRows = await tx
        .select()
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));
      const hasActiveRsvp = currentRsvpRows.some(
        (r) => !["cancelled", "expired"].includes(r.status) && !r.parentRsvpId,
      );

      if (hasActiveRsvp) return;

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

      const fitsCapacity = slotsLeft >= needed;
      const activeStatus: RsvpStatus = fitsCapacity ? "confirmed" : "waitlisted";
      const plusOneStatus: RsvpStatus = fitsCapacity ? "confirmed" : "waitlisted";

      const now = new Date();
      const paymentDeadline = event.paymentRequired
        ? (event.paymentDueDate && event.paymentDueDate.getTime() > now.getTime()
            ? event.paymentDueDate
            : new Date(now.getTime() + 24 * 60 * 60 * 1000))
        : null;

    const cancelledRsvp = currentRsvpRows.find(
      (r) => r.status === "cancelled" && !r.parentRsvpId,
    );

    let parentRsvpId: string;

    if (cancelledRsvp) {
      await tx
        .update(rsvps)
        .set({
          status: activeStatus,
          ticketType: null,
          checkedInAt: null,
          plusOneName: null,
          parentRsvpId: null,
          notes: null,
          tags: sql`ARRAY[]::text[]`,
          paymentStatus: "unpaid",
          paymentDeadlineAt: paymentDeadline,
          updatedAt: now,
        })
        .where(eq(rsvps.id, cancelledRsvp.id));
      parentRsvpId = cancelledRsvp.id;
    } else {
      const [inserted] = await tx
        .insert(rsvps)
        .values({
          memberId: member.id,
          eventId,
          status: activeStatus,
          paymentStatus: "unpaid",
          paymentDeadlineAt: paymentDeadline,
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
            ticketType: null,
            checkedInAt: null,
            notes: null,
            tags: sql`ARRAY[]::text[]`,
            paymentStatus: "unpaid",
            paymentDeadlineAt: paymentDeadline,
            updatedAt: now,
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
          paymentDeadlineAt: paymentDeadline,
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
    if (isNextRedirect(err)) throw err;
    console.error("Admin RSVP action failed:", err);
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
    if (!parentRsvp || parentRsvp.status === "cancelled" || parentRsvp.status === "expired" || parentRsvp.checkedInAt) return;

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

  sendNotification({
    memberId: member.id,
    eventId,
    template: "rsvp_cancelled",
  }).catch(() => {});

  promoteWaitlist(eventId).catch(() => {});

  redirect(returnTo);
}

export async function deleteEventAction(formData: FormData) {
  await requireAdminMember();
  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect("/admin/events");
  }

  const db = getDb();

  await db
    .update(events)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function updateRsvpStatusAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const status = readEnum(formData, "status", [
    "confirmed",
    "waitlisted",
    "cancelled",
    "expired",
  ] as const);
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) {
    redirect(returnTo);
  }

  const db = getDb();

  const rsvpRows = await db
    .select({ memberId: rsvps.memberId, eventId: rsvps.eventId, prevStatus: rsvps.status, parentRsvpId: rsvps.parentRsvpId })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);

  await db
    .update(rsvps)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  if (status === "confirmed" && rsvpRows[0] && !rsvpRows[0].parentRsvpId) {
    const plusOneRows = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled"), ne(rsvps.status, "expired")))
      .limit(1);
    if (plusOneRows.length > 0) {
      await db
        .update(rsvps)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(rsvps.id, plusOneRows[0].id));
    }
  }

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");

  if (rsvpRows[0] && !rsvpRows[0].parentRsvpId) {
    const r = rsvpRows[0];
    const template =
      status === "confirmed" && r.prevStatus === "waitlisted"
        ? "rsvp_promoted"
        : status === "confirmed"
          ? "rsvp_confirmed"
          : status === "waitlisted"
            ? "rsvp_waitlisted"
            : status === "cancelled"
              ? "rsvp_cancelled"
              : status === "expired"
                ? "rsvp_expired"
                : null;

    if (template) {
      sendNotification({ memberId: r.memberId, eventId: r.eventId, template }).catch(() => {});
    }

    if (status === "cancelled" || status === "expired") {
      promoteWaitlist(r.eventId).catch(() => {});
    }
  }

  redirect(returnTo);
}

export async function updateRsvpPaymentAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const paymentStatus = readEnum(formData, "paymentStatus", [
    "unpaid",
    "pending",
    "paid",
    "waived",
  ] as const);
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) {
    redirect(returnTo);
  }

  const db = getDb();

  const rsvpRows = await db
    .select({ memberId: rsvps.memberId, eventId: rsvps.eventId })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);

  const setConfirmed = paymentStatus === "paid" || paymentStatus === "waived";

  await db
    .update(rsvps)
    .set({
      paymentStatus,
      ...(setConfirmed ? { status: "confirmed" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  if (setConfirmed) {
    const plusOneRows = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled"), ne(rsvps.status, "expired")))
      .limit(1);
    if (plusOneRows.length > 0) {
      await db
        .update(rsvps)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(rsvps.id, plusOneRows[0].id));
    }
  }

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");

  if (rsvpRows[0]) {
    const r = rsvpRows[0];
    const template =
      paymentStatus === "paid"
        ? "payment_confirmed"
        : paymentStatus === "waived"
          ? "payment_waived"
          : null;

    if (template) {
      sendNotification({ memberId: r.memberId, eventId: r.eventId, template }).catch(() => {});
    }
  }

  redirect(returnTo);
}

export async function deleteRsvpAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) {
    redirect(returnTo);
  }

  const db = getDb();

  await db.delete(rsvps).where(eq(rsvps.id, rsvpId));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect(returnTo);
}

export async function checkInRsvpAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const checkedIn = readText(formData, "checkedIn");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) {
    redirect(returnTo);
  }

  const db = getDb();

  await db
    .update(rsvps)
    .set({
      checkedInAt: checkedIn === "1" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  redirect(returnTo);
}

export async function addEventExpenseAction(formData: FormData) {
  await requireAdminMember();
  const eventId = readText(formData, "eventId");
  const description = readText(formData, "description");
  const category = readText(formData, "category") || "other";
  const amountCents = readOptionalPriceCents(formData, "amount");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!eventId || !description || amountCents === null) {
    redirect(returnTo);
  }

  const db = getDb();
  await db.insert(eventExpenses).values({
    id: crypto.randomUUID(),
    eventId,
    description,
    amountCents,
    category,
  });

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function deleteEventExpenseAction(formData: FormData) {
  await requireAdminMember();
  const expenseId = readText(formData, "expenseId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!expenseId) {
    redirect(returnTo);
  }

  const db = getDb();
  await db.delete(eventExpenses).where(eq(eventExpenses.id, expenseId));

  revalidatePath(returnTo);
  redirect(returnTo);
}

function parseEventForm(formData: FormData) {
  const title = readText(formData, "title");
  const slug = slugify(readText(formData, "slug") || title);

  return {
    type: readText(formData, "type") || "meet",
    title,
    slug,
    description: readOptionalText(formData, "description"),
    startsAt: readDate(formData, "startsAt"),
    endsAt: readOptionalDate(formData, "endsAt"),
    locationText: readOptionalText(formData, "locationText"),
    addressText: readOptionalText(formData, "addressText"),
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
    promoImageUrl: readOptionalText(formData, "promoImageUrl"),
    capacity: readCapacity(formData),
    rsvpOpensAt: readOptionalDate(formData, "rsvpOpensAt"),
    rsvpClosesAt: readOptionalDate(formData, "rsvpClosesAt"),
    costCents: readOptionalPriceCents(formData, "cost"),
    paymentNotifyMemberId: readOptionalText(formData, "paymentNotifyMemberId") || null,
    qrCheckInEnabled: readCheckbox(formData, "qrCheckInEnabled"),
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

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: string }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function promoteWaitlist(eventId: string): Promise<void> {
  const db = getDb();

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) return;

  const waitlistedRows = await db
    .select({ id: rsvps.id, memberId: rsvps.memberId, parentRsvpId: rsvps.parentRsvpId })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted"), sql`${rsvps.parentRsvpId} IS NULL`))
    .orderBy(asc(rsvps.createdAt));

  if (waitlistedRows.length === 0) return;

  const confirmedCountRow = await db
    .select({ total: count() })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), inArray(rsvps.status, capacityBearingStatuses)));
  let confirmedCount = Number(confirmedCountRow[0]?.total ?? 0);

  for (const entry of waitlistedRows) {
    const slotsLeft = event.capacity - confirmedCount;
    if (slotsLeft < 1) break;

    const plusOneRows = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.parentRsvpId, entry.id), eq(rsvps.status, "waitlisted")))
      .limit(1);
    const hasWaitlistedPlusOne = plusOneRows.length > 0;
    const totalNeeded = hasWaitlistedPlusOne ? 2 : 1;

    if (slotsLeft < totalNeeded) continue;

    const now = new Date();
    const activeStatus: RsvpStatus = "confirmed";
    const paymentDeadline = event.paymentRequired
      ? (event.paymentDueDate && event.paymentDueDate.getTime() > now.getTime()
          ? event.paymentDueDate
          : new Date(now.getTime() + 24 * 60 * 60 * 1000))
      : null;

    await db
      .update(rsvps)
      .set({ status: activeStatus, paymentDeadlineAt: paymentDeadline, updatedAt: now })
      .where(eq(rsvps.id, entry.id));

    confirmedCount++;

    if (hasWaitlistedPlusOne) {
      await db
        .update(rsvps)
        .set({ status: activeStatus, paymentDeadlineAt: paymentDeadline, updatedAt: now })
        .where(eq(rsvps.id, plusOneRows[0].id));

      confirmedCount++;
    }

    sendNotification({
      memberId: entry.memberId,
      eventId,
      template: "rsvp_promoted",
    }).catch(() => {});
  }
}

export async function updateRsvpNotesAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const notes = readOptionalText(formData, "notes") ?? null;
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) redirect(returnTo);

  const db = getDb();
  await db
    .update(rsvps)
    .set({ notes, updatedAt: new Date() })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function addRsvpTagAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const tag = readText(formData, "tag")?.trim();
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId || !tag) redirect(returnTo);

  const db = getDb();
  await db
    .update(rsvps)
    .set({
      tags: sql`array_append(COALESCE(${rsvps.tags}, '{}'), ${tag})`,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function removeRsvpTagAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const tag = readText(formData, "tag");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId || !tag) redirect(returnTo);

  const db = getDb();
  await db
    .update(rsvps)
    .set({
      tags: sql`array_remove(COALESCE(${rsvps.tags}, '{}'), ${tag})`,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function markRsvpPendingAction(formData: FormData) {
  const member = await requireCurrentMember();
  const rsvpId = readText(formData, "rsvpId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";

  if (!rsvpId) redirect(returnTo);

  const db = getDb();
  const [row] = await db
    .select({ memberId: rsvps.memberId, eventId: rsvps.eventId })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);
  if (!row || row.memberId !== member.id) redirect(returnTo);

  await db
    .update(rsvps)
    .set({ paymentStatus: "pending", updatedAt: new Date() })
    .where(eq(rsvps.id, rsvpId));

  const [eventRow] = await db
    .select({ paymentNotifyMemberId: events.paymentNotifyMemberId, title: events.title })
    .from(events)
    .where(eq(events.id, row.eventId))
    .limit(1);

  if (eventRow?.paymentNotifyMemberId) {
    const [notifyMember] = await db
      .select({ telegramId: members.telegramId })
      .from(members)
      .where(eq(members.id, eventRow.paymentNotifyMemberId))
      .limit(1);

    if (notifyMember?.telegramId) {
      const { sendTelegramMessage } = await import("@cego/telegram");
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
      if (BOT_TOKEN) {
        sendTelegramMessage({
          botToken: BOT_TOKEN,
          chatId: notifyMember.telegramId,
          text: `💰 *${member.telegramDisplayName}* marked their payment as pending for *${eventRow.title}*.`,
          parseMode: "Markdown",
        }).catch(() => {});
      }
    }
  }

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function dropPlusOneAction(formData: FormData) {
  const member = await requireCurrentMember();
  const rsvpId = readText(formData, "rsvpId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/dashboard";

  if (!rsvpId) redirect(returnTo);

  const db = getDb();
  const [row] = await db
    .select({ memberId: rsvps.memberId, eventId: rsvps.eventId })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);
  if (!row || row.memberId !== member.id) redirect(returnTo);

  const [plusOneRow] = await db
    .select({ id: rsvps.id })
    .from(rsvps)
    .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled")))
    .limit(1);

  if (plusOneRow) {
    await db
      .update(rsvps)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(rsvps.id, plusOneRow.id));

    promoteWaitlist(row.eventId).catch(() => {});
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function expirePastDeadlineRsvps(): Promise<void> {
  const db = getDb();
  const now = new Date();

  const expiredRows = await db
    .select({ id: rsvps.id, eventId: rsvps.eventId, memberId: rsvps.memberId, parentRsvpId: rsvps.parentRsvpId })
    .from(rsvps)
    .where(
      and(
        eq(rsvps.status, "confirmed"),
        ne(rsvps.paymentStatus, "paid"),
        ne(rsvps.paymentStatus, "waived"),
        sql`${rsvps.paymentDeadlineAt} IS NOT NULL AND ${rsvps.paymentDeadlineAt} <= ${now}`,
      ),
    );

  if (expiredRows.length === 0) return;

  const parentIds = expiredRows.filter((r) => !r.parentRsvpId).map((r) => r.id);
  const plusOneIds = expiredRows.filter((r) => r.parentRsvpId).map((r) => r.id);
  const allIds = [...parentIds, ...plusOneIds];

  if (allIds.length > 0) {
    await db
      .update(rsvps)
      .set({ status: "expired", updatedAt: now })
      .where(inArray(rsvps.id, allIds));
  }

  const eventIds = [...new Set(expiredRows.map((r) => r.eventId))];
  for (const eventId of eventIds) {
    promoteWaitlist(eventId).catch(() => {});
  }

  for (const row of parentIds.length > 0 ? expiredRows.filter((r) => parentIds.includes(r.id)) : []) {
    sendNotification({ memberId: row.memberId, eventId: row.eventId, template: "rsvp_expired" }).catch(() => {});
  }
}
