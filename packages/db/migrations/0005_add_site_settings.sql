CREATE TABLE "site_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_name" text NOT NULL DEFAULT 'cego',
  "tagline" text NOT NULL DEFAULT 'Community Event Group Orchestrator',
  "accent_color" text NOT NULL DEFAULT '#183f3c',
  "accent_color_dark" text NOT NULL DEFAULT '#5bbcb4',
  "highlight_color" text NOT NULL DEFAULT '#d8b35a',
  "logo_url" text,
  "hero_title" text NOT NULL DEFAULT 'Run community events without turning the group chat into a spreadsheet.',
  "hero_body" text NOT NULL DEFAULT 'cego is the self-hosted planning surface for communities that need Telegram identity, capacity-aware RSVPs, built-in surveys, organizer review, and room to add cego-native payment steps when paid registration is ready.',
  "footer_text" text NOT NULL DEFAULT 'AGPLv3. Self-hosted.',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
