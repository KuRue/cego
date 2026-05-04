CREATE TABLE event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  category text NOT NULL DEFAULT 'other',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX event_expenses_event_idx ON event_expenses(event_id);
