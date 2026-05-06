DO $$ BEGIN
  ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN others THEN
  NULL;
END $$;
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS payment_deadline_at timestamptz;
