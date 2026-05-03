ALTER TABLE "hi_events_webhook_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hi_events_webhook_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "rsvps" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "rsvps" SET "status" = 'confirmed' WHERE "status" IN ('approved_to_pay', 'paid_registered');--> statement-breakpoint
DROP TYPE "public"."rsvp_status";--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('confirmed', 'waitlisted', 'cancelled');--> statement-breakpoint
ALTER TABLE "rsvps" ALTER COLUMN "status" SET DATA TYPE "public"."rsvp_status" USING "status"::"public"."rsvp_status";--> statement-breakpoint
DROP INDEX "events_hi_events_event_id_idx";--> statement-breakpoint
DROP INDEX "rsvps_hi_events_checkout_url_idx";--> statement-breakpoint
DROP INDEX "rsvps_hi_events_order_id_idx";--> statement-breakpoint
DROP INDEX "rsvps_hi_events_attendee_id_idx";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "hi_events_event_id";--> statement-breakpoint
ALTER TABLE "rsvps" DROP COLUMN "hi_events_checkout_url";--> statement-breakpoint
ALTER TABLE "rsvps" DROP COLUMN "hi_events_order_id";--> statement-breakpoint
ALTER TABLE "rsvps" DROP COLUMN "hi_events_attendee_id";
