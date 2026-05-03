# Integrations

## Telegram Identity

Telegram is the only member identity provider. cego supports two Telegram-backed entry paths that both map the Telegram user ID to a `members` record and issue the same signed cego session cookie.

- Telegram Mini App: verifies signed `Telegram.WebApp.initData`.
- Browser Telegram SSO: verifies Telegram Login Widget callback params at `/api/telegram/login`.

Required behavior:

- Reject invalid or expired Telegram init data.
- Reject invalid or expired Telegram Login Widget data.
- Create a member record on first valid access.
- Update Telegram username, display name, and photo on later access.
- Do not create password credentials.
- Do not treat Telegram username as stable identity; use Telegram ID.
- Require BotFather `/setdomain` configuration for browser SSO on `cego.example.com`.

## Telegram Bot

The Telegram bot supports launch links, group membership checks, and notifications.

Required bot responsibilities:

- Provide a button or command that opens the cego Mini App.
- Check whether a Telegram user belongs to the configured cego group.
- Check the configured cego group administrator list so Telegram group admins become cego app admins.
- Send RSVP confirmation notifications.
- Send waitlist notifications.
- Send survey reminders and event reminders.
- Record delivery state in `notifications`.

## cego-Native Registration

cego owns the member-facing registration flow in the current MVP. Members should not be sent to a separate event site to understand their RSVP or registration state.

Required cego responsibilities:

- Show event, capacity, RSVP, waitlist, survey, and member profile state directly in cego.
- Let organizers change RSVP state from cego admin.
- Keep contact email available for organizer follow-up and future payment work.
- Keep registration copy and policy links inside cego so the experience feels like one app.

## Stripe

Stripe is deferred. If major event payment is needed, the preferred direction is direct cego-owned Stripe Checkout after organizer approval.

cego should not store payment method data. Future direct Stripe work should store only the Stripe checkout/session/payment identifiers needed for operational reconciliation and refunds.

## Internal CRM-lite

cego stores CRM-lite organizer context directly in its own database. This keeps v1 self-hosted, simpler, and aligned with Telegram-backed member profiles.

Required behavior:

- Show member profile, RSVP history, survey completion, notes, and tags in cego admin.
- Let organizers add and remove member tags.
- Let organizers add member notes.
- Keep attendance history derived from `rsvps`.
- Defer external CRM API sync until the built-in admin tools are not enough.

## Cloudflare Tunnel

cloudflared exposes public hostnames to internal Docker services.

Required published applications:

- `cego.example.com` to cego web app.
- `api.cego.example.com` to cego API if separate.

Admin surfaces should be protected by Cloudflare Access.
