CREATE TYPE event_status_new AS ENUM ('draft', 'show', 'closed', 'archived');

ALTER TABLE events ALTER COLUMN status TYPE event_status_new USING
  CASE status
    WHEN 'open' THEN 'show'
    WHEN 'full' THEN 'show'
    ELSE status::text
  END::event_status_new;

ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';

DROP TYPE event_status;
ALTER TYPE event_status_new RENAME TO event_status;
