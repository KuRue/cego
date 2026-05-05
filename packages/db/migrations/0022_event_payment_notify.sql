ALTER TABLE events ADD COLUMN payment_notify_member_id uuid REFERENCES members(id) ON DELETE SET NULL;
