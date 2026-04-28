CREATE TABLE "hi_events_webhook_logs" (
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
ALTER TABLE "rsvps" ADD COLUMN "hi_events_checkout_url" text;--> statement-breakpoint
ALTER TABLE "hi_events_webhook_logs" ADD CONSTRAINT "hi_events_webhook_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hi_events_webhook_logs" ADD CONSTRAINT "hi_events_webhook_logs_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hi_events_webhook_logs_event_id_idx" ON "hi_events_webhook_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "hi_events_webhook_logs_rsvp_id_idx" ON "hi_events_webhook_logs" USING btree ("rsvp_id");--> statement-breakpoint
CREATE INDEX "hi_events_webhook_logs_hi_events_event_id_idx" ON "hi_events_webhook_logs" USING btree ("hi_events_event_id");--> statement-breakpoint
CREATE INDEX "hi_events_webhook_logs_hi_events_order_id_idx" ON "hi_events_webhook_logs" USING btree ("hi_events_order_id");--> statement-breakpoint
CREATE INDEX "hi_events_webhook_logs_status_idx" ON "hi_events_webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rsvps_hi_events_checkout_url_idx" ON "rsvps" USING btree ("hi_events_checkout_url");