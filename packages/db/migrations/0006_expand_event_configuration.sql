ALTER TABLE "events" ADD COLUMN "description" text;
ALTER TABLE "events" ADD COLUMN "price_cents" integer;
ALTER TABLE "events" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;
ALTER TABLE "events" ADD COLUMN "payment_required" boolean DEFAULT false NOT NULL;
ALTER TABLE "events" ADD COLUMN "rules_text" text;
ALTER TABLE "events" ADD COLUMN "terms_text" text;
ALTER TABLE "events" ADD COLUMN "refund_policy_text" text;
ALTER TABLE "events" ADD COLUMN "organizer_notes" text;
