ALTER TABLE events ADD COLUMN payment_methods text;
ALTER TABLE events ADD COLUMN payment_due_date timestamptz;

CREATE TYPE rsvp_payment_status AS ENUM ('unpaid', 'paid', 'waived');
ALTER TABLE rsvps ADD COLUMN payment_status rsvp_payment_status DEFAULT 'unpaid';
