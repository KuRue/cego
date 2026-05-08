ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS payment_deadline_at timestamptz;
