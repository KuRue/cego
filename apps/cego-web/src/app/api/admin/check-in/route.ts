import { NextResponse } from "next/server";
import { getDb, events, rsvps, members } from "@cego/db";
import { and, eq } from "@cego/db";
import { requireAdminMember } from "@/lib/session";

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

  if (rsvpRow.checkedInAt) {
    const [memberRow] = await db
      .select({ telegramDisplayName: members.telegramDisplayName, telegramPhotoUrl: members.telegramPhotoUrl })
      .from(members)
      .where(eq(members.id, rsvpRow.memberId))
      .limit(1);

    return NextResponse.json({
      ok: false,
      error: "Already checked in",
      displayName: memberRow?.telegramDisplayName,
      photoUrl: memberRow?.telegramPhotoUrl,
      plusOneName: rsvpRow.plusOneName,
    });
  }

  const now = new Date();

  await db
    .update(rsvps)
    .set({ checkedInAt: now, updatedAt: now })
    .where(eq(rsvps.id, rsvpRow.id));

  const plusOneRows = await db
    .select({ id: rsvps.id, status: rsvps.status, checkedInAt: rsvps.checkedInAt })
    .from(rsvps)
    .where(and(eq(rsvps.parentRsvpId, rsvpRow.id), eq(rsvps.status, "confirmed")));

  for (const po of plusOneRows) {
    if (!po.checkedInAt) {
      await db
        .update(rsvps)
        .set({ checkedInAt: now, updatedAt: now })
        .where(eq(rsvps.id, po.id));
    }
  }

  const [memberRow] = await db
    .select({ telegramDisplayName: members.telegramDisplayName, telegramPhotoUrl: members.telegramPhotoUrl })
    .from(members)
    .where(eq(members.id, rsvpRow.memberId))
    .limit(1);

  return NextResponse.json({
    ok: true,
    displayName: memberRow?.telegramDisplayName,
    photoUrl: memberRow?.telegramPhotoUrl,
    plusOneName: rsvpRow.plusOneName,
  });
}
