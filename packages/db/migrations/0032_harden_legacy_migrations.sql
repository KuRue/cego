UPDATE "events"
SET "type" = CASE
  WHEN "type" = 'annual_retreat' THEN 'major_event'
  WHEN "type" = 'mini_retreat' THEN 'local_event'
  ELSE "type"
END
WHERE "type" IN ('annual_retreat', 'mini_retreat');
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "hi_events_event_id" text;
--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "hi_events_checkout_url" text;
--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "hi_events_order_id" text;
--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN IF NOT EXISTS "hi_events_attendee_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_hi_events_event_id_idx" ON "events" USING btree ("hi_events_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rsvps_hi_events_checkout_url_idx" ON "rsvps" USING btree ("hi_events_checkout_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rsvps_hi_events_order_id_idx" ON "rsvps" USING btree ("hi_events_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rsvps_hi_events_attendee_id_idx" ON "rsvps" USING btree ("hi_events_attendee_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hi_events_webhook_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid,
  "rsvp_id" uuid,
  "hi_events_event_id" text,
  "hi_events_order_id" text,
  "hi_events_attendee_id" text,
  "event_type" text NOT NULL,
  "status" text NOT NULL,
  "payload_json" jsonb,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hi_events_webhook_logs_event_id_idx" ON "hi_events_webhook_logs" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hi_events_webhook_logs_rsvp_id_idx" ON "hi_events_webhook_logs" USING btree ("rsvp_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hi_events_webhook_logs_hi_events_event_id_idx" ON "hi_events_webhook_logs" USING btree ("hi_events_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hi_events_webhook_logs_hi_events_order_id_idx" ON "hi_events_webhook_logs" USING btree ("hi_events_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hi_events_webhook_logs_status_idx" ON "hi_events_webhook_logs" USING btree ("status");
--> statement-breakpoint
ALTER TYPE "rsvp_status" ADD VALUE IF NOT EXISTS 'expired';
--> statement-breakpoint
ALTER TYPE "rsvp_payment_status" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'paid';
--> statement-breakpoint
ALTER TYPE "rsvp_payment_status" ADD VALUE IF NOT EXISTS 'refund_requested';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rsvp_status'
      AND e.enumlabel = 'expired'
  ) THEN
    RAISE EXCEPTION 'rsvp_status enum is missing value expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rsvp_payment_status'
      AND e.enumlabel = 'pending'
  ) THEN
    RAISE EXCEPTION 'rsvp_payment_status enum is missing value pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rsvp_payment_status'
      AND e.enumlabel = 'refund_requested'
  ) THEN
    RAISE EXCEPTION 'rsvp_payment_status enum is missing value refund_requested';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_event_id_fkey";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_member_id_fkey";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_id_fkey";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
DO $$
BEGIN
  BEGIN
    ALTER TABLE "hi_events_webhook_logs" ADD CONSTRAINT "hi_events_webhook_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE "hi_events_webhook_logs" ADD CONSTRAINT "hi_events_webhook_logs_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "rsvps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
