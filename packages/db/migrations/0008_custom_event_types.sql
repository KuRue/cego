ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "event_types" text NOT NULL DEFAULT '["major_event","local_event"]';
ALTER TABLE "events" ALTER COLUMN "type" TYPE text;
DROP TYPE IF EXISTS "event_type";
