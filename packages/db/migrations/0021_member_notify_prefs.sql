ALTER TABLE members ADD COLUMN notify_prefs jsonb DEFAULT '{"rsvpUpdates":true,"newEvents":true}';
