DROP INDEX IF EXISTS "notifications_member_event_template_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_member_event_template_idx" ON "notifications" USING btree ("member_id", "event_id", "template_key");
