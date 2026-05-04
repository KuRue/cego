ALTER TABLE rsvps ADD COLUMN notes text;
ALTER TABLE rsvps ADD COLUMN tags text[] DEFAULT '{}';
