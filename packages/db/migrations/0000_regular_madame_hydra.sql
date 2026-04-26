CREATE TYPE "public"."event_status" AS ENUM('draft', 'open', 'full', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('annual_retreat', 'mini_retreat');--> statement-breakpoint
CREATE TYPE "public"."member_group_status" AS ENUM('unknown', 'member', 'not_member');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('confirmed', 'waitlisted', 'approved_to_pay', 'paid_registered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."survey_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location_text" text,
	"capacity" integer NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"hi_events_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"author_member_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_tag_assignments" (
	"member_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_tag_assignments_pk" PRIMARY KEY("member_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "member_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" text NOT NULL,
	"telegram_username" text,
	"telegram_display_name" text NOT NULL,
	"telegram_photo_url" text,
	"email" text,
	"group_status" "member_group_status" DEFAULT 'unknown' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid,
	"event_id" uuid,
	"telegram_chat_id" text,
	"telegram_message_id" text,
	"template_key" text NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"hi_events_order_id" text,
	"hi_events_attendee_id" text,
	"ticket_type" text,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"event_id" uuid,
	"answers_json" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "survey_status" DEFAULT 'draft' NOT NULL,
	"schema_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_author_member_id_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tag_assignments" ADD CONSTRAINT "member_tag_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tag_assignments" ADD CONSTRAINT "member_tag_assignments_tag_id_member_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."member_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "events_hi_events_event_id_idx" ON "events" USING btree ("hi_events_event_id");--> statement-breakpoint
CREATE INDEX "member_notes_member_id_idx" ON "member_notes" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_notes_author_member_id_idx" ON "member_notes" USING btree ("author_member_id");--> statement-breakpoint
CREATE INDEX "member_tag_assignments_member_id_idx" ON "member_tag_assignments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_tag_assignments_tag_id_idx" ON "member_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_tags_name_idx" ON "member_tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "members_telegram_id_idx" ON "members" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "notifications_member_id_idx" ON "notifications" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "notifications_event_id_idx" ON "notifications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_member_event_idx" ON "rsvps" USING btree ("member_id","event_id");--> statement-breakpoint
CREATE INDEX "rsvps_event_status_idx" ON "rsvps" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "rsvps_hi_events_order_id_idx" ON "rsvps" USING btree ("hi_events_order_id");--> statement-breakpoint
CREATE INDEX "rsvps_hi_events_attendee_id_idx" ON "rsvps" USING btree ("hi_events_attendee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_responses_survey_member_idx" ON "survey_responses" USING btree ("survey_id","member_id");--> statement-breakpoint
CREATE INDEX "survey_responses_event_id_idx" ON "survey_responses" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "survey_responses_member_id_idx" ON "survey_responses" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "surveys_event_id_idx" ON "surveys" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "surveys_status_idx" ON "surveys" USING btree ("status");