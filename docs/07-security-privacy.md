# Security And Privacy

## Security Model

ARF is a private community operations system. Security should assume that event details, contact information, survey answers, and rental planning information are sensitive.

## Identity

- Telegram is the primary identity provider.
- Telegram ID is the stable identity key.
- ARF does not create password accounts.
- ARF must verify Telegram Mini App init data before creating a session.
- ARF must check configured Telegram group membership before allowing RSVP flows.

## Admin Protection

Admin access uses two layers:

1. Cloudflare Access for ARF admin routes and `crm.arf.kurue.com`.
2. App-level organizer roles inside ARF and EspoCRM.

Cloudflare Access protects the perimeter. App roles protect actions and records after login.

## Data Handling

Collect only data needed to run events:

- Telegram identity.
- Email for payment/ticketing needs.
- RSVP status.
- Rooming, dietary, accessibility, travel, and privacy preferences.
- Survey responses.
- Organizer notes in EspoCRM.

Avoid collecting unnecessary legal identity, address, or payment information in ARF. Payment method information belongs only in Stripe/Hi.Events.

## Sensitive Data

Treat these as organizer-only:

- Exact rental address before attendee approval.
- Accessibility needs.
- Dietary restrictions.
- Rooming preferences.
- Emergency or safety notes if added later.
- Organizer notes.

## Retention Placeholders

Final retention policy should be decided before production launch. Initial defaults:

- Keep member profile while the person remains in the community or until deletion is requested.
- Keep event RSVP history for organizer continuity.
- Keep survey answers only as long as useful for planning.
- Keep webhook and notification logs long enough for audit/debugging, then prune.

## Source Availability

Because ARF-specific code is AGPLv3, deployed network users must be able to access the corresponding source for the running ARF application. The app should include a visible source link when public code hosting is ready.

## Privacy Policy Placeholder

Before inviting real attendees, publish a plain-language privacy policy explaining:

- What ARF collects.
- Why ARF collects it.
- Which services process it.
- Who can see organizer-only information.
- How members can request correction or deletion.
- What data is retained after events.

