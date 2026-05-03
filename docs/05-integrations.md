# Integrations

## Telegram Identity

Telegram is the only member identity provider. ARF supports two Telegram-backed entry paths that both map the Telegram user ID to a `members` record and issue the same signed ARF session cookie.

- Telegram Mini App: verifies signed `Telegram.WebApp.initData`.
- Browser Telegram SSO: verifies Telegram Login Widget callback params at `/api/telegram/login`.

Required behavior:

- Reject invalid or expired Telegram init data.
- Reject invalid or expired Telegram Login Widget data.
- Create a member record on first valid access.
- Update Telegram username, display name, and photo on later access.
- Do not create password credentials.
- Do not treat Telegram username as stable identity; use Telegram ID.
- Require BotFather `/setdomain` configuration for browser SSO on `arf.kurue.com`.

## Telegram Bot

The Telegram bot supports launch links, group membership checks, and notifications.

Required bot responsibilities:

- Provide a button or command that opens the ARF Mini App.
- Check whether a Telegram user belongs to the configured ARF group.
- Check the configured ARF group administrator list so Telegram group admins become ARF app admins.
- Send RSVP confirmation notifications.
- Send waitlist notifications.
- Send survey reminders and event reminders.
- Record delivery state in `notifications`.

## ARF-Native Registration

ARF owns the member-facing registration flow in the current MVP. Members should not be sent to a separate event site to understand their RSVP or registration state.

Required ARF responsibilities:

- Show event, capacity, RSVP, waitlist, survey, and member profile state directly in ARF.
- Let organizers change RSVP state from ARF Admin.
- Keep contact email available for organizer follow-up and future payment work.
- Keep registration copy and policy links inside ARF so the experience feels like one app.

## Stripe

Stripe is deferred. If annual retreat payment is needed, the preferred direction is direct ARF-owned Stripe Checkout after organizer approval.

ARF should not store payment method data. Future direct Stripe work should store only the Stripe checkout/session/payment identifiers needed for operational reconciliation and refunds.

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

Admin surfaces should be protected by Cloudflare Access.
