ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "event_types" text NOT NULL DEFAULT '["major_event","local_event"]';
ALTER TABLE "events" ALTER COLUMN "type" TYPE text;
UPDATE "events"
SET "type" = CASE
  WHEN "type" = 'annual_retreat' THEN 'major_event'
  WHEN "type" = 'mini_retreat' THEN 'local_event'
  ELSE "type"
END
WHERE "type" IN ('annual_retreat', 'mini_retreat');
DROP TYPE IF EXISTS "event_type";
