import { NextResponse } from "next/server";
import { getDb, events, rsvps, members } from "@cego/db";
import { and, eq, sql } from "@cego/db";
import { requireAdminMember } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    await requireAdminMember();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { rsvpId?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { rsvpId, eventId } = body;
  if (!rsvpId || !eventId) {
    return NextResponse.json({ ok: false, error: "Missing rsvpId or eventId" }, { status: 400 });
  }

  const db = getDb();

  const [eventRow] = await db
    .select({ qrCheckInEnabled: events.qrCheckInEnabled, paymentRequired: events.paymentRequired })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!eventRow?.qrCheckInEnabled) {
    return NextResponse.json({ ok: false, error: "QR check-in not enabled for this event" }, { status: 400 });
  }

  const [rsvpRow] = await db
    .select({
      id: rsvps.id,
      memberId: rsvps.memberId,
      eventId: rsvps.eventId,
      status: rsvps.status,
      paymentStatus: rsvps.paymentStatus,
      checkedInAt: rsvps.checkedInAt,
      plusOneName: rsvps.plusOneName,
      parentRsvpId: rsvps.parentRsvpId,
      tags: rsvps.tags,
      notes: rsvps.notes,
    })
    .from(rsvps)
    .where(eq(rsvps.id, rsvpId))
    .limit(1);

  if (!rsvpRow) {
    return NextResponse.json({ ok: false, error: "RSVP not found" }, { status: 404 });
  }

  if (rsvpRow.eventId !== eventId) {
    return NextResponse.json({ ok: false, error: "RSVP does not belong to this event" }, { status: 400 });
  }

  if (rsvpRow.parentRsvpId) {
    return NextResponse.json({ ok: false, error: "This is a plus-one. Scan the primary RSVP." }, { status: 400 });
  }

  if (rsvpRow.status !== "confirmed") {
    return NextResponse.json({ ok: false, error: `Status is ${rsvpRow.status}, not confirmed` }, { status: 400 });
  }

  if (eventRow.paymentRequired && rsvpRow.paymentStatus !== "paid" && rsvpRow.paymentStatus !== "waived") {
    return NextResponse.json({ ok: false, error: `Payment is ${rsvpRow.paymentStatus}` }, { status: 400 });
  }

  const plusOneRows = await db
    .select({ id: rsvps.id, status: rsvps.status, paymentStatus: rsvps.paymentStatus, checkedInAt: rsvps.checkedInAt })
    .from(rsvps)
    .where(and(eq(rsvps.parentRsvpId, rsvpRow.id), eq(rsvps.status, "confirmed")));

  if (
    eventRow.paymentRequired &&
    plusOneRows.some((po) => po.paymentStatus !== "paid" && po.paymentStatus !== "waived")
  ) {
    return NextResponse.json({ ok: false, error: "+1 payment is not confirmed" }, { status: 400 });
  }

  if (rsvpRow.checkedInAt) {
    const memberRow = await getCheckInMember(db, rsvpRow.memberId);

    return NextResponse.json({
      ok: false,
      error: "Already checked in",
      displayName: memberRow?.telegramDisplayName,
      username: memberRow?.telegramUsername,
      photoUrl: memberRow?.telegramPhotoUrl,
      email: memberRow?.email,
      plusOneName: rsvpRow.plusOneName,
      rsvpTags: rsvpRow.tags,
      rsvpNotes: rsvpRow.notes,
    });
  }

  const now = new Date();

  const checkedInRows = await db
    .update(rsvps)
    .set({ checkedInAt: now, updatedAt: now })
    .where(and(eq(rsvps.id, rsvpRow.id), sql`${rsvps.checkedInAt} IS NULL`))
    .returning({ id: rsvps.id });

  if (checkedInRows.length === 0) {
    const memberRow = await getCheckInMember(db, rsvpRow.memberId);

    return NextResponse.json({
      ok: false,
      error: "Already checked in",
      displayName: memberRow?.telegramDisplayName,
      username: memberRow?.telegramUsername,
      photoUrl: memberRow?.telegramPhotoUrl,
      email: memberRow?.email,
      plusOneName: rsvpRow.plusOneName,
      rsvpTags: rsvpRow.tags,
      rsvpNotes: rsvpRow.notes,
    });
  }

  for (const po of plusOneRows) {
    if (!po.checkedInAt) {
      await db
        .update(rsvps)
        .set({ checkedInAt: now, updatedAt: now })
        .where(and(eq(rsvps.id, po.id), sql`${rsvps.checkedInAt} IS NULL`));
    }
  }

  const memberRow = await getCheckInMember(db, rsvpRow.memberId);

  sendNotification({
    memberId: rsvpRow.memberId,
    eventId,
    template: "checked_in",
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    displayName: memberRow?.telegramDisplayName,
    username: memberRow?.telegramUsername,
    photoUrl: memberRow?.telegramPhotoUrl,
    email: memberRow?.email,
    plusOneName: rsvpRow.plusOneName,
    rsvpTags: rsvpRow.tags,
    rsvpNotes: rsvpRow.notes,
  });
}

async function getCheckInMember(db: ReturnType<typeof getDb>, memberId: string) {
  const [memberRow] = await db
    .select({
      telegramDisplayName: members.telegramDisplayName,
      telegramUsername: members.telegramUsername,
      telegramPhotoUrl: members.telegramPhotoUrl,
      email: members.email,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  return memberRow;
}
