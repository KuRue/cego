ALTER TABLE events
  ADD COLUMN rsvp_opens_at timestamp with time zone,
  ADD COLUMN rsvp_closes_at timestamp with time zone;
