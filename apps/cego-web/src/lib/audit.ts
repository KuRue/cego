import { auditLog, getDb } from "@cego/db";

type AuditAction =
  | "rsvp_confirmed"
  | "rsvp_waitlisted"
  | "rsvp_cancelled"
  | "rsvp_expired"
  | "rsvp_promoted"
  | "payment_marked_pending"
  | "payment_confirmed"
  | "payment_waived"
  | "refund_requested"
  | "refund_processed"
  | "check_in"
  | "check_in_undo"
  | "admin_rsvp_added"
  | "event_created"
  | "event_draft_created"
  | "event_updated"
  | "event_deleted"
  | "event_undeleted"
  | "event_expense_added"
  | "event_expense_deleted"
  | "rsvp_deleted"
  | "drop_plus_one"
  | "rsvp_batch_expired"
  | "survey_deleted"
  | "survey_response"
  | "member_deactivated"
  | "member_reactivated"
  | "member_email_updated"
  | "member_tag_assigned"
  | "member_tag_removed"
  | "rsvp_notes_updated"
  | "rsvp_tag_added"
  | "rsvp_tag_removed"
  | "site_settings_updated"
  | "note_added";

export async function audit(params: {
  eventId?: string;
  memberId?: string;
  actorId?: string;
  action: AuditAction | string;
  detail?: string;
}) {
  const db = getDb();
  await db.insert(auditLog).values({
    eventId: params.eventId ?? null,
    memberId: params.memberId ?? null,
    actorId: params.actorId ?? null,
    action: params.action,
    detail: params.detail ?? null,
  }).catch((err) => { console.error("audit failed:", err); });
}
