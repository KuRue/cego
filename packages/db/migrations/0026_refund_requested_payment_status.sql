DO $$ BEGIN
  ALTER TYPE rsvp_payment_status ADD VALUE IF NOT EXISTS 'refund_requested';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
