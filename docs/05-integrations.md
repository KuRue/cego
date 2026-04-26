# Integrations

## Telegram Mini App

Telegram Mini App authentication is the primary sign-in path. The ARF app verifies signed Telegram init data on every Mini App session and maps the Telegram user ID to a `members` record.

Required behavior:

- Reject invalid or expired Telegram init data.
- Create a member record on first valid access.
- Update Telegram username, display name, and photo on later access.
- Do not create password credentials.
- Do not treat Telegram username as stable identity; use Telegram ID.

## Telegram Bot

The Telegram bot supports launch links, group membership checks, and notifications.

Required bot responsibilities:

- Provide a button or command that opens the ARF Mini App.
- Check whether a Telegram user belongs to the configured ARF group.
- Send RSVP confirmation notifications.
- Send waitlist notifications.
- Send annual retreat payment approval links.
- Send survey reminders and event reminders.
- Record delivery state in `notifications`.

## Hi.Events

Hi.Events is used for annual retreat payment and ticket registration after ARF approval. ARF should not fork Hi.Events unless a required feature cannot be integrated externally.

Required ARF responsibilities:

- Store the linked Hi.Events event ID on annual retreat records.
- Generate or display the correct checkout link only for `approved_to_pay` members.
- Include enough member/order context to link the webhook back to the ARF member.
- Receive completed order or attendee webhooks.
- Store Hi.Events order and attendee IDs on `rsvps`.

Hi.Events owns:

- Ticket types.
- Stripe payment checkout.
- Order records.
- Attendee records.
- QR check-in.
- Ticketing/refund emails.

## Stripe

Stripe is integrated through Hi.Events, not directly through ARF in v1.

ARF should not store payment method data. ARF stores only ticketing/payment state received from Hi.Events.

## Internal CRM-lite

ARF stores CRM-lite organizer context directly in its own database. This keeps v1 self-hosted, simpler, and aligned with Telegram-backed member profiles.

Required behavior:

- Show member profile, RSVP history, survey completion, notes, and tags in ARF admin.
- Let organizers add and remove member tags.
- Let organizers add member notes.
- Keep attendance history derived from `rsvps`.
- Defer external CRM API sync until the built-in admin tools are not enough.

## Cloudflare Tunnel

cloudflared exposes public hostnames to internal Docker services.

Required published applications:

- `arf.kurue.com` to ARF web app.
- `api.arf.kurue.com` to ARF API if separate.
- `events.arf.kurue.com` to Hi.Events.

Admin surfaces should be protected by Cloudflare Access.
