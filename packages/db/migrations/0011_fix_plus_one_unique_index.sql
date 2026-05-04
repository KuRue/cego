DROP INDEX IF EXISTS "rsvps_member_event_idx";
CREATE UNIQUE INDEX "rsvps_member_event_idx" ON "rsvps" ("member_id","event_id") WHERE "parent_rsvp_id" IS NULL;
