"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
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
import { getSiteSettings } from "@/lib/settings";
import { parseDateInTimezone } from "@/lib/tz";

const capacityBearingStatuses = ["confirmed"] as const;
const waitlistPaymentWindowMs = 12 * 60 * 60 * 1000;
const latePaymentWindowMs = 60 * 60 * 1000;
const finalRsvpWindowMs = 3 * 24 * 60 * 60 * 1000;

function calcPaymentDeadline(event: {
  paymentRequired: boolean | null;
  paymentDueDate: Date | null;
  rsvpClosesAt: Date | null;
}, options: {
  source?: "initial_rsvp" | "waitlist_promotion";
  waitlistExhausted?: boolean;
  now?: Date;
} = {}): Date | null {
  if (!event.paymentRequired) return null;

  const now = options.now ?? new Date();
  const source = options.source ?? "initial_rsvp";
  const inFinalRsvpWindow = isInFinalRsvpWindow(event, now);
  const initialDeadlinePassed =
    event.paymentDueDate != null && event.paymentDueDate.getTime() <= now.getTime();

  if (source === "waitlist_promotion") {
    const minDeadline = new Date(now.getTime() + waitlistPaymentWindowMs);
    if (!initialDeadlinePassed && event.paymentDueDate) {
      return capDeadlineAtRsvpDeadline(event.paymentDueDate.getTime() > minDeadline.getTime() ? event.paymentDueDate : minDeadline, event);
    }
    return capDeadlineAtRsvpDeadline(minDeadline, event);
  }

  if (event.paymentDueDate && !initialDeadlinePassed) {
    return capDeadlineAtRsvpDeadline(event.paymentDueDate, event);
  }

  if (inFinalRsvpWindow || options.waitlistExhausted) {
    return capDeadlineAtRsvpDeadline(new Date(now.getTime() + latePaymentWindowMs), event);
  }

  return capDeadlineAtRsvpDeadline(new Date(now.getTime() + 24 * 60 * 60 * 1000), event);
}

function isInFinalRsvpWindow(event: { rsvpClosesAt: Date | null }, now = new Date()): boolean {
  if (!event.rsvpClosesAt) return false;
  const diff = event.rsvpClosesAt.getTime() - now.getTime();
  return diff <= finalRsvpWindowMs;
}

function isPastRsvpDeadline(event: { rsvpClosesAt: Date | null }, now = new Date()): boolean {
  return event.rsvpClosesAt != null && event.rsvpClosesAt.getTime() <= now.getTime();
}

function capDeadlineAtRsvpDeadline(deadline: Date, event: { rsvpClosesAt: Date | null }): Date {
  if (event.rsvpClosesAt && event.rsvpClosesAt.getTime() < deadline.getTime()) {
    return event.rsvpClosesAt;
  }

  return deadline;
}

export async function createEventAction(formData: FormData) {
  await requireAdminMember();
  const db = getDb();

  await db.insert(events).values(await parseEventForm(formData));

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function createDraftEventAction(formData: FormData) {
  await requireAdminMember();
  const db = getDb();
  const now = new Date();
  const defaultType = readText(formData, "type") || "meet";

  await db.insert(events).values({
    type: defaultType,
    title: "New event",
    slug: `event-${now.getTime()}`,
    startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    capacity: 12,
    status: "draft",
  });

  revalidatePath("/admin/events", "layout");
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
  const now = new Date();

  try {
    const parsedEvent = await parseEventForm(formData);

    await db.transaction(async (tx) => {
      const [previousEvent] = await tx
        .select({ paymentDueDate: events.paymentDueDate })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      await tx
        .update(events)
        .set({ ...parsedEvent, updatedAt: now })
        .where(eq(events.id, eventId));

      if (previousEvent && !sameDate(previousEvent.paymentDueDate, parsedEvent.paymentDueDate)) {
        const previousDeadlineCondition = previousEvent.paymentDueDate
          ? sql`(${rsvps.paymentDeadlineAt} IS NULL OR ${rsvps.paymentDeadlineAt} = ${previousEvent.paymentDueDate.toISOString()})`
          : sql`${rsvps.paymentDeadlineAt} IS NULL`;

        await tx
          .update(rsvps)
          .set({ paymentDeadlineAt: parsedEvent.paymentDueDate, updatedAt: now })
          .where(
            and(
              eq(rsvps.eventId, eventId),
              eq(rsvps.status, "confirmed"),
              eq(rsvps.paymentStatus, "unpaid"),
              previousDeadlineCondition,
            ),
          );
      }
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Event update failed:", { eventId, error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    redirect("/admin/events?event_error=update_failed");
  }

  promoteWaitlist(eventId).catch(() => {});

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime();
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
  let plusOneWaitlisted = false;
  let shouldRunWaitlist = false;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);

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
      const waitlistedRows = await tx
        .select({ total: count() })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")));
      const waitlistedCount = Number(waitlistedRows[0]?.total ?? 0);
      const hasWaitlistAhead = waitlistedCount > 0;

      const fitsCapacity = !hasWaitlistAhead && slotsLeft >= needed;
      const activeStatus: RsvpStatus = !hasWaitlistAhead && slotsLeft >= 1 ? "confirmed" : "waitlisted";
      const plusOneStatus: RsvpStatus = activeStatus === "confirmed" && fitsCapacity ? "confirmed" : "waitlisted";

      rsvpStatus = activeStatus;
      plusOneWaitlisted = plusOneName !== null && plusOneStatus === "waitlisted";
      shouldRunWaitlist = hasWaitlistAhead && slotsLeft > 0;

      const now = new Date();
      const paymentDeadline = activeStatus === "confirmed"
        ? calcPaymentDeadline(event, {
            source: "initial_rsvp",
            waitlistExhausted: waitlistedCount === 0 && (event.paymentDueDate?.getTime() ?? Number.POSITIVE_INFINITY) <= now.getTime(),
            now,
          })
        : null;
      const plusOnePaymentDeadline = plusOneStatus === "confirmed" ? paymentDeadline : null;

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
              paymentDeadlineAt: plusOnePaymentDeadline,
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
                paymentDeadlineAt: plusOnePaymentDeadline,
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
              paymentDeadlineAt: plusOnePaymentDeadline,
            });
          }
        }
      } else {
        await tx
          .update(rsvps)
          .set({ status: "cancelled", updatedAt: now })
          .where(
            and(
              eq(rsvps.eventId, eventId),
              eq(rsvps.memberId, member.id),
              sql`${rsvps.parentRsvpId} IS NOT NULL`,
              ne(rsvps.status, "cancelled"),
            ),
          );
      }

      if (surveyId) {
        const surveyRows = await tx
          .select()
          .from(surveys)
          .where(and(eq(surveys.id, surveyId), eq(surveys.eventId, eventId), eq(surveys.status, "published")))
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

  if (shouldRunWaitlist) {
    await promoteWaitlist(eventId);
  }

  if (rsvpStatus) {
    const template = rsvpStatus === "confirmed" && plusOneWaitlisted
      ? "rsvp_confirmed_plusone_waitlisted"
      : rsvpStatus === "confirmed"
        ? "rsvp_confirmed"
        : "rsvp_waitlisted";
    sendNotification({
      memberId: member.id,
      eventId,
      template,
    }).catch(() => {});
  }

  {
    let detail = plusOneName ? `+1: ${plusOneName}${plusOneWaitlisted ? " (waitlisted)" : ""}` : undefined;
    if (surveyId && detail) detail += `; survey: ${surveyId}`;
    else if (surveyId) detail = `survey: ${surveyId}`;
    audit({
      eventId,
      memberId: member.id,
      actorId: member.id,
      action: rsvpStatus === "confirmed" ? "rsvp_confirmed" : "rsvp_waitlisted",
      detail,
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
  let shouldRunWaitlist = false;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);

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
      const waitlistedRows = await tx
        .select({ total: count() })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")));
      const waitlistedCount = Number(waitlistedRows[0]?.total ?? 0);
      const hasWaitlistAhead = waitlistedCount > 0;

      const fitsCapacity = !hasWaitlistAhead && slotsLeft >= needed;
      const activeStatus: RsvpStatus = !hasWaitlistAhead && slotsLeft >= 1 ? "confirmed" : "waitlisted";
      const plusOneStatus: RsvpStatus = activeStatus === "confirmed" && fitsCapacity ? "confirmed" : "waitlisted";

      const now = new Date();
      const paymentDeadline = activeStatus === "confirmed"
        ? calcPaymentDeadline(event, {
            source: "initial_rsvp",
            waitlistExhausted: waitlistedCount === 0 && (event.paymentDueDate?.getTime() ?? Number.POSITIVE_INFINITY) <= now.getTime(),
            now,
          })
        : null;
      const plusOnePaymentDeadline = plusOneStatus === "confirmed" ? paymentDeadline : null;
      shouldRunWaitlist = hasWaitlistAhead && slotsLeft > 0;

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
            paymentDeadlineAt: plusOnePaymentDeadline,
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
              paymentDeadlineAt: plusOnePaymentDeadline,
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
            paymentDeadlineAt: plusOnePaymentDeadline,
          });
        }
      }
    } else {
      await tx
        .update(rsvps)
        .set({ status: "cancelled", updatedAt: now })
        .where(
          and(
            eq(rsvps.eventId, eventId),
            eq(rsvps.memberId, member.id),
            sql`${rsvps.parentRsvpId} IS NOT NULL`,
            ne(rsvps.status, "cancelled"),
          ),
        );
    }

      if (surveyId) {
        const surveyRows = await tx
          .select()
          .from(surveys)
          .where(and(eq(surveys.id, surveyId), eq(surveys.eventId, eventId), eq(surveys.status, "published")))
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
  if (shouldRunWaitlist) {
    await promoteWaitlist(eventId);
  }

  audit({
    eventId,
    memberId: member.id,
    actorId: member.id,
    action: "admin_rsvp_added",
  }).catch(() => {});

  redirect(returnTo);
}

export async function adminRsvpForMemberAction(formData: FormData) {
  const admin = await requireAdminMember();
  const eventId = readText(formData, "eventId");
  const targetMemberId = readText(formData, "memberId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin";

  if (!eventId || !targetMemberId) redirect(returnTo);

  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);

    const existing = await tx
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, targetMemberId)));
    const hasActive = existing.some(
      (r) => !["cancelled", "expired"].includes(r.status) && !r.parentRsvpId,
    );
    if (hasActive) return;

    const now = new Date();
    const cancelled = existing.find((r) => r.status === "cancelled" && !r.parentRsvpId);
    const expired = existing.find((r) => r.status === "expired" && !r.parentRsvpId);

    const paymentDeadline: Date | null = null;

    if (cancelled) {
      await tx
        .update(rsvps)
        .set({
          status: "confirmed",
          ticketType: null,
          checkedInAt: null,
          plusOneName: null,
          parentRsvpId: null,
          notes: `Added by ${admin.telegramDisplayName}`,
          tags: sql`ARRAY[]::text[]`,
          paymentStatus: "waived",
          paymentDeadlineAt: paymentDeadline,
          updatedAt: now,
        })
        .where(eq(rsvps.id, cancelled.id));
    } else if (expired) {
      await tx
        .update(rsvps)
        .set({
          status: "confirmed",
          ticketType: null,
          checkedInAt: null,
          plusOneName: null,
          parentRsvpId: null,
          notes: `Added by ${admin.telegramDisplayName}`,
          tags: sql`ARRAY[]::text[]`,
          paymentStatus: "waived",
          paymentDeadlineAt: paymentDeadline,
          updatedAt: now,
        })
        .where(eq(rsvps.id, expired.id));
    } else {
      await tx.insert(rsvps).values({
        memberId: targetMemberId,
        eventId,
        status: "confirmed",
        paymentStatus: "waived",
        paymentDeadlineAt: paymentDeadline,
        notes: `Added by ${admin.telegramDisplayName}`,
      });
    }
  });

  revalidatePath(returnTo);
  revalidatePath("/admin");

  audit({
    eventId,
    memberId: targetMemberId,
    actorId: admin.id,
    action: "admin_rsvp_added",
    detail: "Added by admin",
  }).catch(() => {});

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

  let hadPaid = false;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);

    const memberRsvps = await tx
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.memberId, member.id)));

    const parentRsvp = memberRsvps.find((r) => !r.parentRsvpId);
    if (!parentRsvp || parentRsvp.status === "cancelled" || parentRsvp.status === "expired" || parentRsvp.checkedInAt) return;

    hadPaid = parentRsvp.paymentStatus === "paid" || parentRsvp.paymentStatus === "waived" || parentRsvp.paymentStatus === "pending";

    const now = new Date();

    if (hadPaid) {
      const newTags = Array.isArray(parentRsvp.tags)
        ? [...(parentRsvp.tags as string[]).filter((t) => t !== "refund_requested"), "refund_requested"]
        : ["refund_requested"];
      await tx
        .update(rsvps)
        .set({ tags: newTags, updatedAt: now })
        .where(eq(rsvps.id, parentRsvp.id));

      const plusOne = memberRsvps.find((r) => r.parentRsvpId === parentRsvp.id && r.status !== "cancelled" && r.status !== "expired");
      if (plusOne && (plusOne.paymentStatus === "paid" || plusOne.paymentStatus === "waived" || plusOne.paymentStatus === "pending")) {
        const plusOneTags = Array.isArray(plusOne.tags)
          ? [...(plusOne.tags as string[]).filter((t) => t !== "refund_requested"), "refund_requested"]
          : ["refund_requested"];
        await tx
          .update(rsvps)
          .set({ tags: plusOneTags, updatedAt: now })
          .where(eq(rsvps.id, plusOne.id));
      }
    } else {
      await tx
        .update(rsvps)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(rsvps.id, parentRsvp.id));

      await tx
        .update(rsvps)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(rsvps.parentRsvpId, parentRsvp.id));
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath("/admin");

  if (hadPaid) {
    audit({
      eventId,
      memberId: member.id,
      actorId: member.id,
      action: "refund_requested",
    }).catch(() => {});

    sendNotification({
      memberId: member.id,
      eventId,
      template: "rsvp_cancelled",
    }).catch(() => {});

    const [eventRow] = await db
      .select({ paymentNotifyMemberId: events.paymentNotifyMemberId, title: events.title })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (eventRow?.paymentNotifyMemberId) {
      const [notifyMember] = await db
        .select({ telegramId: members.telegramId })
        .from(members)
        .where(eq(members.id, eventRow.paymentNotifyMemberId))
        .limit(1);

      if (notifyMember?.telegramId) {
        const handle = member.telegramUsername ? `@${member.telegramUsername}` : member.telegramDisplayName;
        const { sendTelegramMessage } = await import("@cego/telegram");
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
        if (BOT_TOKEN) {
          sendTelegramMessage({
            botToken: BOT_TOKEN,
            chatId: notifyMember.telegramId,
            text: `↩️ *${member.telegramDisplayName}* (${handle}) requested a refund for *${eventRow.title}*.`,
            parseMode: "Markdown",
          }).catch(() => {});
        }
      }
    }
  } else {
    audit({
      eventId,
      memberId: member.id,
      actorId: member.id,
      action: "rsvp_cancelled",
    }).catch(() => {});

    sendNotification({
      memberId: member.id,
      eventId,
      template: "rsvp_cancelled",
    }).catch(() => {});

    promoteWaitlist(eventId).catch(() => {});
  }

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

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function undeleteEventAction(formData: FormData) {
  await requireAdminMember();
  const eventId = readText(formData, "eventId");

  if (!eventId) {
    redirect("/admin/events");
  }

  const db = getDb();

  await db
    .update(events)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(events.id, eventId));

  revalidatePath("/admin/events", "layout");
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
  let notification: { memberId: string; eventId: string; template: "rsvp_confirmed" | "rsvp_promoted" | "rsvp_waitlisted" | "rsvp_cancelled" | "rsvp_expired" } | null = null;
  let promoteEventId: string | null = null;

  await db.transaction(async (tx) => {
    const rsvpRows = await tx
      .select({
        memberId: rsvps.memberId,
        eventId: rsvps.eventId,
        prevStatus: rsvps.status,
        parentRsvpId: rsvps.parentRsvpId,
        paymentStatus: rsvps.paymentStatus,
        paymentDeadlineAt: rsvps.paymentDeadlineAt,
      })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId))
      .limit(1);
    const row = rsvpRows[0];
    if (!row) return;

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);

    const now = new Date();
    let actualStatus: RsvpStatus = status;

    if (status === "confirmed") {
      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.id, row.eventId))
        .limit(1);
      const event = eventRows[0];
      if (!event) return;

      const countRows = await tx
        .select({ total: count() })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, row.eventId), inArray(rsvps.status, capacityBearingStatuses)));
      let confirmedCount = Number(countRows[0]?.total ?? 0);
      let slotsLeft = event.capacity - confirmedCount;
      const needsSlot = row.prevStatus === "confirmed" ? 0 : 1;

      if (needsSlot > 0 && slotsLeft < needsSlot) {
        actualStatus = "waitlisted";
        await tx
          .update(rsvps)
          .set({ status: "waitlisted", updatedAt: now })
          .where(eq(rsvps.id, rsvpId));
      } else {
        const paymentDeadline = row.paymentStatus === "unpaid" && !row.paymentDeadlineAt
          ? calcPaymentDeadline(event, {
              source: row.prevStatus === "waitlisted" ? "waitlist_promotion" : "initial_rsvp",
              now,
            })
          : row.paymentDeadlineAt;

        await tx
          .update(rsvps)
          .set({
            status: "confirmed",
            paymentDeadlineAt: paymentDeadline,
            updatedAt: now,
          })
          .where(eq(rsvps.id, rsvpId));

        if (needsSlot > 0) {
          confirmedCount++;
          slotsLeft--;
        }

        if (!row.parentRsvpId) {
          const plusOneRows = await tx
            .select({
              id: rsvps.id,
              status: rsvps.status,
              paymentStatus: rsvps.paymentStatus,
              paymentDeadlineAt: rsvps.paymentDeadlineAt,
            })
            .from(rsvps)
            .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled"), ne(rsvps.status, "expired")))
            .limit(1);
          const plusOne = plusOneRows[0];
          if (plusOne) {
            const plusOneNeedsSlot = plusOne.status === "confirmed" ? 0 : 1;
            if (plusOneNeedsSlot === 0 || slotsLeft >= plusOneNeedsSlot) {
              const plusOneDeadline = plusOne.paymentStatus === "unpaid" && !plusOne.paymentDeadlineAt
                ? calcPaymentDeadline(event, { source: "waitlist_promotion", now })
                : plusOne.paymentDeadlineAt;
              await tx
                .update(rsvps)
                .set({
                  status: "confirmed",
                  paymentDeadlineAt: plusOneDeadline,
                  updatedAt: now,
                })
                .where(eq(rsvps.id, plusOne.id));
            }
          }
        }
      }
    } else {
      await tx
        .update(rsvps)
        .set({
          status,
          updatedAt: now,
        })
        .where(eq(rsvps.id, rsvpId));

      if (!row.parentRsvpId && (status === "waitlisted" || status === "cancelled" || status === "expired")) {
        await tx
          .update(rsvps)
          .set({ status, updatedAt: now })
          .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled"), ne(rsvps.status, "expired")));
      }
    }

    const template =
      actualStatus === "confirmed" && row.prevStatus === "waitlisted"
        ? "rsvp_promoted"
        : actualStatus === "confirmed"
          ? "rsvp_confirmed"
          : actualStatus === "waitlisted"
            ? "rsvp_waitlisted"
            : actualStatus === "cancelled"
              ? "rsvp_cancelled"
              : actualStatus === "expired"
                ? "rsvp_expired"
                : null;

    if (!row.parentRsvpId && template) {
      notification = { memberId: row.memberId, eventId: row.eventId, template };
    }

    if (status === "cancelled" || status === "expired") {
      promoteEventId = row.eventId;
    }
  });

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");

  if (notification) {
    const { eventId: nEventId, memberId: nMemberId } = notification;
    sendNotification(notification).catch(() => {});
    audit({
      eventId: nEventId,
      memberId: nMemberId,
      action: `rsvp_${status}`,
    }).catch(() => {});
  }

  if (promoteEventId) {
    await promoteWaitlist(promoteEventId);
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

  const setConfirmed = paymentStatus === "paid" || paymentStatus === "waived";
  let notification: { memberId: string; eventId: string; template: "payment_confirmed" | "payment_waived" } | null = null;
  let auditEventId: string | null = null;
  let auditMemberId: string | null = null;

  await db.transaction(async (tx) => {
    const rsvpRows = await tx
      .select({
        memberId: rsvps.memberId,
        eventId: rsvps.eventId,
        status: rsvps.status,
        parentRsvpId: rsvps.parentRsvpId,
      })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId))
      .limit(1);
    const row = rsvpRows[0];
    if (!row) return;

    auditEventId = row.eventId;
    auditMemberId = row.memberId;

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);

    const now = new Date();
    let nextStatus: RsvpStatus | undefined;

    if (setConfirmed && row.status !== "confirmed") {
      const eventRows = await tx
        .select({ capacity: events.capacity })
        .from(events)
        .where(eq(events.id, row.eventId))
        .limit(1);
      const event = eventRows[0];
      const countRows = await tx
        .select({ total: count() })
        .from(rsvps)
        .where(and(eq(rsvps.eventId, row.eventId), inArray(rsvps.status, capacityBearingStatuses)));
      const slotsLeft = (event?.capacity ?? 0) - Number(countRows[0]?.total ?? 0);
      if (slotsLeft >= 1) {
        nextStatus = "confirmed";
      }
    }

    await tx
      .update(rsvps)
      .set({
        paymentStatus,
        ...(nextStatus ? { status: nextStatus } : {}),
        updatedAt: now,
      })
      .where(eq(rsvps.id, rsvpId));

    if (!row.parentRsvpId) {
      await tx
        .update(rsvps)
        .set({ paymentStatus, updatedAt: now })
        .where(and(eq(rsvps.parentRsvpId, rsvpId), eq(rsvps.status, "confirmed")));
    }

    const template =
      paymentStatus === "paid"
        ? "payment_confirmed"
        : paymentStatus === "waived"
          ? "payment_waived"
          : null;

    if (template) {
      notification = { memberId: row.memberId, eventId: row.eventId, template };
    }
  });

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");

  if (notification) {
    sendNotification(notification).catch(() => {});
  }

  if (auditEventId && auditMemberId) {
    audit({
      eventId: auditEventId,
      memberId: auditMemberId,
      action: `payment_${paymentStatus}`,
    }).catch(() => {});
  }

  redirect(returnTo);
}

export async function processRefundAction(formData: FormData) {
  await requireAdminMember();
  const rsvpId = readText(formData, "rsvpId");
  const returnTo = readReturnPath(formData, "returnTo") ?? "/admin/events";

  if (!rsvpId) redirect(returnTo);

  const db = getDb();
  let refundEventId: string | null = null;

  await db.transaction(async (tx) => {
    const rsvpRows = await tx
      .select({ eventId: rsvps.eventId, parentRsvpId: rsvps.parentRsvpId, tags: rsvps.tags })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId))
      .limit(1);
    const row = rsvpRows[0];
    if (!row) return;

    refundEventId = row.eventId;

    const tags = Array.isArray(row.tags) ? row.tags as string[] : [];
    if (!tags.includes("refund_requested")) return;

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);

    const now = new Date();
    const cleanTags = tags.filter((t) => t !== "refund_requested");
    await tx
      .update(rsvps)
      .set({ status: "cancelled", tags: cleanTags, updatedAt: now })
      .where(eq(rsvps.id, rsvpId));

    if (!row.parentRsvpId) {
      await tx
        .update(rsvps)
        .set({ status: "cancelled", updatedAt: now })
        .where(and(eq(rsvps.parentRsvpId, rsvpId), ne(rsvps.status, "cancelled"), ne(rsvps.status, "expired")));
    }
  });

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");

  if (refundEventId) {
    audit({
      eventId: refundEventId,
      action: "refund_processed",
      detail: rsvpId,
    }).catch(() => {});
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
  let promoteEventId: string | null = null;

  await db.transaction(async (tx) => {
    const rsvpRows = await tx
      .select({ eventId: rsvps.eventId, parentRsvpId: rsvps.parentRsvpId, status: rsvps.status })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId))
      .limit(1);
    const row = rsvpRows[0];
    if (!row) return;

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);

    if (!row.parentRsvpId) {
      await tx.delete(rsvps).where(eq(rsvps.parentRsvpId, rsvpId));
    }

    await tx.delete(rsvps).where(eq(rsvps.id, rsvpId));

    if (row.status === "confirmed") {
      promoteEventId = row.eventId;
    }
  });

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");
  if (promoteEventId) {
    await promoteWaitlist(promoteEventId);
  }
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

  const [checkInRow] = await db
    .select({ eventId: rsvps.eventId, memberId: rsvps.memberId })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);

  await db
    .update(rsvps)
    .set({
      checkedInAt: checkedIn === "1" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, rsvpId));

  revalidatePath("/admin/events", "layout");
  revalidatePath("/dashboard");

  if (checkInRow) {
    audit({
      eventId: checkInRow.eventId,
      memberId: checkInRow.memberId,
      action: checkedIn === "1" ? "check_in" : "check_in_undo",
    }).catch(() => {});
  }

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

async function parseEventForm(formData: FormData) {
  const title = readText(formData, "title");
  const slug = slugify(readText(formData, "slug") || title);
  const tz = (await getSiteSettings()).timezone;

  return {
    type: readText(formData, "type") || "meet",
    title,
    slug,
    description: readOptionalText(formData, "description"),
    startsAt: readDateTz(formData, "startsAt", tz),
    endsAt: readOptionalDateTz(formData, "endsAt", tz),
    locationText: readOptionalText(formData, "locationText"),
    addressText: readOptionalText(formData, "addressText"),
    priceCents: readOptionalPriceCents(formData, "price"),
    currency: readCurrency(formData, "currency"),
    paymentRequired: readCheckbox(formData, "paymentRequired"),
    paymentMethods: readOptionalText(formData, "paymentMethods"),
    paymentDueDate: readOptionalDateTz(formData, "paymentDueDate", tz),
    rulesText: readOptionalText(formData, "rulesText"),
    termsText: readOptionalText(formData, "termsText"),
    refundPolicyText: readOptionalText(formData, "refundPolicyText"),
    organizerNotes: readOptionalText(formData, "organizerNotes"),
    imageUrl: readOptionalText(formData, "imageUrl"),
    promoImageUrl: readOptionalText(formData, "promoImageUrl"),
    capacity: readCapacity(formData),
    rsvpOpensAt: readOptionalDateTz(formData, "rsvpOpensAt", tz),
    rsvpClosesAt: readOptionalDateTz(formData, "rsvpClosesAt", tz),
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

function readDateTz(formData: FormData, key: string, tz: string): Date {
  const value = readText(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return parseDateInTimezone(value, tz);
}

function readOptionalDateTz(formData: FormData, key: string, tz: string): Date | null {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  return parseDateInTimezone(value, tz);
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
  const promotedMemberIds = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);

    const eventRows = await tx
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const event = eventRows[0];
    const now = new Date();
    if (!event || event.status !== "show" || event.startsAt.getTime() <= now.getTime() || isPastRsvpDeadline(event, now)) {
      return [];
    }

    const confirmedCountRow = await tx
      .select({ total: count() })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), inArray(rsvps.status, capacityBearingStatuses)));
    let slotsLeft = event.capacity - Number(confirmedCountRow[0]?.total ?? 0);
    if (slotsLeft < 1) return [];

    const waitlistedRows = await tx
      .select({
        id: rsvps.id,
        memberId: rsvps.memberId,
        parentRsvpId: rsvps.parentRsvpId,
      })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "waitlisted")))
      .orderBy(asc(rsvps.createdAt));

    const promoted = new Set<string>();

    for (const entry of waitlistedRows) {
      if (slotsLeft < 1) break;

      if (entry.parentRsvpId) {
        const parentRows = await tx
          .select({ status: rsvps.status, memberId: rsvps.memberId })
          .from(rsvps)
          .where(eq(rsvps.id, entry.parentRsvpId))
          .limit(1);
        const parent = parentRows[0];
        if (!parent || parent.status !== "confirmed") continue;

        await tx
          .update(rsvps)
          .set({
            status: "confirmed",
            paymentStatus: "unpaid",
            paymentDeadlineAt: calcPaymentDeadline(event, { source: "waitlist_promotion", now }),
            updatedAt: now,
          })
          .where(eq(rsvps.id, entry.id));

        slotsLeft--;
        promoted.add(parent.memberId);
        continue;
      }

      await tx
        .update(rsvps)
        .set({
          status: "confirmed",
          paymentStatus: "unpaid",
          paymentDeadlineAt: calcPaymentDeadline(event, { source: "waitlist_promotion", now }),
          updatedAt: now,
        })
        .where(eq(rsvps.id, entry.id));

      slotsLeft--;
      promoted.add(entry.memberId);
    }

    return Array.from(promoted);
  });

  for (const memberId of promotedMemberIds) {
    sendNotification({ memberId, eventId, template: "rsvp_promoted" }).catch(() => {});
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
    .select({ memberId: rsvps.memberId, eventId: rsvps.eventId, parentRsvpId: rsvps.parentRsvpId, paymentDeadlineAt: rsvps.paymentDeadlineAt })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);
  if (!row || row.memberId !== member.id) redirect(returnTo);

  const [eventRow] = await db
    .select({ paymentNotifyMemberId: events.paymentNotifyMemberId, title: events.title, paymentDueDate: events.paymentDueDate })
    .from(events)
    .where(eq(events.id, row.eventId))
    .limit(1);

  const deadline = row.paymentDeadlineAt ?? eventRow?.paymentDueDate;
  if (deadline && deadline.getTime() <= Date.now()) redirect(returnTo);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);
    const now = new Date();

    await tx
      .update(rsvps)
      .set({ paymentStatus: "pending", updatedAt: now })
      .where(eq(rsvps.id, rsvpId));

    if (!row.parentRsvpId) {
      await tx
        .update(rsvps)
        .set({ paymentStatus: "pending", updatedAt: now })
        .where(and(eq(rsvps.parentRsvpId, rsvpId), eq(rsvps.status, "confirmed")));
    }
  });

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
        const handle = member.telegramUsername ? `@${member.telegramUsername}` : member.telegramDisplayName;
        sendTelegramMessage({
          botToken: BOT_TOKEN,
          chatId: notifyMember.telegramId,
          text: `💰 *${member.telegramDisplayName}* (${handle}) marked their payment as pending for *${eventRow.title}*.`,
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
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.eventId}))`);
      await tx
        .update(rsvps)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(rsvps.id, plusOneRow.id));
    });

    promoteWaitlist(row.eventId).catch(() => {});
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}

export type DeadlineProcessingResult = {
  expiredRsvpCount: number;
  processedEventIds: string[];
};

export async function expirePastDeadlineRsvps(): Promise<DeadlineProcessingResult> {
  const db = getDb();

  const expiredRows = await db
    .select({ id: rsvps.id, eventId: rsvps.eventId, memberId: rsvps.memberId, parentRsvpId: rsvps.parentRsvpId, paymentDeadlineAt: rsvps.paymentDeadlineAt })
    .from(rsvps)
    .where(
      and(
        eq(rsvps.status, "confirmed"),
        eq(rsvps.paymentStatus, "unpaid"),
        sql`EXISTS (
          SELECT 1
          FROM events e
          WHERE e.id = ${rsvps.eventId}
            AND e.payment_required = true
            AND COALESCE(${rsvps.paymentDeadlineAt}, e.payment_due_date) IS NOT NULL
            AND COALESCE(${rsvps.paymentDeadlineAt}, e.payment_due_date) <= now()
        )`,
      ),
    );

  const now = new Date();

  if (expiredRows.length === 0) {
    return { expiredRsvpCount: 0, processedEventIds: [] };
  }

  const expiredIds = expiredRows.map((r) => r.id);
  const eventIds = [...new Set(expiredRows.map((r) => r.eventId))];

  const allRows = await db.transaction(async (tx) => {
    for (const eventId of eventIds) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`);
    }

    const updatedExpiredRows = await tx
      .update(rsvps)
      .set({ status: "expired", updatedAt: now })
      .where(and(inArray(rsvps.id, expiredIds), eq(rsvps.status, "confirmed"), eq(rsvps.paymentStatus, "unpaid")))
      .returning({ id: rsvps.id, eventId: rsvps.eventId, memberId: rsvps.memberId, parentRsvpId: rsvps.parentRsvpId });

    const updatedParentIds = updatedExpiredRows.filter((r) => !r.parentRsvpId).map((r) => r.id);
    const updatedChildRows = updatedParentIds.length > 0
      ? await tx
          .update(rsvps)
          .set({ status: "expired", updatedAt: now })
          .where(
            and(
              inArray(rsvps.parentRsvpId, updatedParentIds),
              ne(rsvps.status, "cancelled"),
              ne(rsvps.status, "expired"),
            ),
          )
          .returning({ id: rsvps.id, eventId: rsvps.eventId, memberId: rsvps.memberId, parentRsvpId: rsvps.parentRsvpId })
      : [];

    const seen = new Set<string>();
    return [...updatedExpiredRows, ...updatedChildRows].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

  if (allRows.length === 0) {
    return { expiredRsvpCount: 0, processedEventIds: eventIds };
  }

  const promotedEventIds = [...new Set(allRows.map((r) => r.eventId))];

  for (const row of allRows.filter((r) => !r.parentRsvpId)) {
    sendNotification({ memberId: row.memberId, eventId: row.eventId, template: "rsvp_expired" }).catch(() => {});
  }

  for (const eventId of promotedEventIds) {
    await promoteWaitlist(eventId);
  }

  return {
    expiredRsvpCount: allRows.length,
    processedEventIds: promotedEventIds,
  };
}
