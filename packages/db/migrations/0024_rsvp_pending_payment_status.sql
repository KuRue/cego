ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE rsvp_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TABLE rsvps ADD COLUMN payment_deadline_at timestamptz;
UPDATE rsvps SET status = 'pending_payment' WHERE status = 'confirmed' AND payment_status IN ('unpaid', 'pending');
