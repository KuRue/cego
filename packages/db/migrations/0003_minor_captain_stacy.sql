ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "events" SET "type" = CASE
  WHEN "type" = 'annual_retreat' THEN 'major_event'
  WHEN "type" = 'mini_retreat' THEN 'local_event'
  ELSE "type"
END;--> statement-breakpoint
DROP TYPE "public"."event_type";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('major_event', 'local_event');--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE "public"."event_type" USING "type"::"public"."event_type";
