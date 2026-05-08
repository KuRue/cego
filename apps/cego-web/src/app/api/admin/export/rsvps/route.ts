import { eq, getDb, members, rsvps, events } from "@cego/db";
import { NextResponse } from "next/server";
import { requireAdminMember } from "@/lib/session";
import { formatDateWithTime } from "@/lib/format-date";
import { getSiteSettings } from "@/lib/settings";
import { csvEscape } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireAdminMember();

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Missing eventId" }, { status: 400 });
  }

  const db = getDb();
  const [eventRow] = await db.select({ title: events.title, currency: events.currency }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!eventRow) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  const tz = (await getSiteSettings()).timezone;

  const rows = await db
    .select({
      rsvp: rsvps,
      member: {
        telegramDisplayName: members.telegramDisplayName,
        telegramUsername: members.telegramUsername,
      },
    })
    .from(rsvps)
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(eq(rsvps.eventId, eventId))
    .orderBy(rsvps.createdAt);

  const header = [
    "Name",
    "Username",
    "Status",
    "Payment",
    "Plus-one",
    "Parent RSVP",
    "Checked In",
    "Payment Deadline",
    "Notes",
    "Tags",
    "Created",
  ].map(csvEscape).join(",");

  const lines = rows.map(({ rsvp: r, member: m }) => {
    const cols = [
      m.telegramDisplayName ?? "",
      m.telegramUsername ? `@${m.telegramUsername}` : "",
      r.status,
      r.paymentStatus,
      r.plusOneName ?? "",
      r.parentRsvpId ?? "",
      r.checkedInAt ? formatDateWithTime(r.checkedInAt, tz) : "",
      r.paymentDeadlineAt ? formatDateWithTime(r.paymentDeadlineAt, tz) : "",
      r.notes ?? "",
      Array.isArray(r.tags) ? (r.tags as string[]).join("; ") : "",
      formatDateWithTime(r.createdAt, tz),
    ];
    return cols.map((c) => csvEscape(String(c))).join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `${eventRow.title.replace(/[^a-zA-Z0-9]/g, "_")}_rsvps.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
