ALTER TABLE rsvps
  ADD COLUMN plus_one_name text,
  ADD COLUMN parent_rsvp_id uuid;

CREATE INDEX rsvps_parent_rsvp_id_idx ON rsvps (parent_rsvp_id);
