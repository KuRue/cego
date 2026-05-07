CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  member_id uuid REFERENCES members(id),
  actor_id uuid REFERENCES members(id),
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_log_member ON audit_log(member_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
