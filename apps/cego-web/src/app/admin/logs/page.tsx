import { desc, eq, getDb, auditLog, events, members } from "@cego/db";
import { requireAdminMember } from "@/lib/session";
import Navbar from "@/components/navbar";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import { formatDateWithTime as fmtDateWithTime } from "@/lib/format-date";
import AppLink from "@/components/app-link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity Log",
};

const actionLabels: Record<string, string> = {
  rsvp_confirmed: "RSVP confirmed",
  rsvp_waitlisted: "RSVP waitlisted",
  rsvp_cancelled: "RSVP cancelled",
  rsvp_expired: "RSVP expired",
  rsvp_promoted: "Promoted from waitlist",
  payment_marked_pending: "Payment marked pending",
  payment_paid: "Payment confirmed",
  payment_unpaid: "Payment set unpaid",
  payment_pending: "Payment set pending",
  payment_waived: "Payment waived",
  refund_requested: "Refund requested",
  refund_processed: "Refund processed",
  check_in: "Checked in",
  check_in_undo: "Check-in undone",
  admin_rsvp_added: "RSVP added by admin",
  event_created: "Event created",
  event_updated: "Event updated",
  event_deleted: "Event deleted",
  event_undeleted: "Event restored",
  member_deactivated: "Member deactivated",
  member_reactivated: "Member reactivated",
  survey_response: "Survey response submitted",
  drop_plus_one: "Plus-one dropped",
  note_added: "Note added",
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();
  const params = await searchParams;

  const eventId = params.eventId as string | undefined;
  const memberId = params.memberId as string | undefined;

  const db = getDb();

  const conditions = [];
  if (eventId) conditions.push(eq(auditLog.eventId, eventId));
  if (memberId) conditions.push(eq(auditLog.memberId, memberId));

  const { and } = await import("@cego/db");
  const rows = await db
    .select({
      id: auditLog.id,
      eventId: auditLog.eventId,
      memberId: auditLog.memberId,
      actorId: auditLog.actorId,
      action: auditLog.action,
      detail: auditLog.detail,
      createdAt: auditLog.createdAt,
      eventTitle: events.title,
      memberName: members.telegramDisplayName,
      actorName: members.telegramDisplayName,
    })
    .from(auditLog)
    .leftJoin(events, eq(auditLog.eventId, events.id))
    .leftJoin(members, eq(auditLog.memberId, members.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { inArray } = await import("@cego/db");
    const actorRows = await db
      .select({ id: members.id, name: members.telegramDisplayName })
      .from(members)
      .where(inArray(members.id, actorIds));
    for (const a of actorRows) actorMap.set(a.id, a.name);
  }

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
      <main className="page-shell mx-auto max-w-4xl px-5 pt-20 pb-16">
        <div className="-mx-5 -mt-20 fixed inset-0 z-0" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(128,128,128,0.15)" }} />
        <div className="relative z-10">
          <AppLink
            href="/admin"
            className="text-sm font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            &larr; Admin
          </AppLink>
          <h1 className="mt-2 font-title text-2xl">Activity Log</h1>

          {rows.length === 0 ? (
            <p className="mt-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>No activity yet.</p>
          ) : (
            <div className="mt-6 space-y-1">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="glass rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
                >
                  <span className="shrink-0 mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
                    {fmtDateWithTime(row.createdAt, settings.timezone)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span style={{ color: "var(--color-foreground)" }}>
                      {actionLabels[row.action] ?? row.action}
                    </span>
                    {row.memberName ? (
                      <span style={{ color: "var(--color-muted)" }}> — {row.memberName}</span>
                    ) : null}
                    {row.eventTitle ? (
                      <span style={{ color: "var(--color-muted)" }}> — {row.eventTitle}</span>
                    ) : null}
                    {row.detail ? (
                      <span style={{ color: "var(--color-muted)" }}> ({row.detail})</span>
                    ) : null}
                    {row.actorId && row.actorId !== row.memberId ? (
                      <span style={{ color: "var(--color-muted)" }}> by {actorMap.get(row.actorId) ?? "admin"}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
