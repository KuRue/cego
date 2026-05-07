CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id text REFERENCES events(id),
  member_id text REFERENCES members(id),
  actor_id text REFERENCES members(id),
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
