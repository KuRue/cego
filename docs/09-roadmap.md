# Roadmap

## Phase 0: Documentation

- Create docs-first repository.
- Define product behavior, architecture, data model, integrations, deployment, security, and community policy placeholders.
- Confirm MVP acceptance scenarios.

## Phase 1: Technical Scaffold

- Create Next.js TypeScript ARF app.
- Add AGPL source link placeholder.
- Add Postgres schema and migrations.
- Add Docker Compose development stack.
- Add cloudflared deployment notes and environment templates.

## Phase 2: Telegram Identity

- Create Telegram bot.
- Configure Telegram Mini App URL.
- Verify Telegram Mini App init data.
- Create/update member profile from Telegram identity.
- Check Telegram group membership.
- Block non-group users from event flows.

## Phase 3: Event And RSVP MVP

- Add annual retreat and mini retreat models.
- Add member-facing event list.
- Add RSVP action.
- Enforce capacity.
- Assign `confirmed` or `waitlisted`.
- Add organizer admin for events, caps, and RSVP state.

## Phase 4: Surveys And Preferences

- Add built-in survey definitions.
- Add member survey response UI.
- Attach responses to member and event.
- Add organizer survey completion view.
- Surface relevant preference summaries in ARF admin.
- Add Telegram confirmation, waitlist, and survey reminder notifications.

## Phase 5: Hi.Events Integration

- Deploy Hi.Events under `events.arf.kurue.com`.
- Link annual retreat records to Hi.Events event IDs.
- Add organizer action to mark members `approved_to_pay`.
- Send Hi.Events checkout links by Telegram.
- Receive Hi.Events completed order webhook.
- Link order/attendee IDs to ARF RSVP.
- Mark completed annual retreat registrations `paid_registered`.

## Phase 6: Internal CRM Admin

- Add searchable member directory.
- Add member profile detail pages for Telegram identity, email, RSVP history, and survey completion.
- Add organizer-only member notes.
- Add organizer-managed member tags.
- Add simple filters for group status, event status, tags, and survey completion.
- Add richer exports and reporting if ARF admin becomes insufficient.

## Phase 7: Beta Readiness

- Test full Mini App RSVP flow with a small Telegram group.
- Test under-cap and over-cap event behavior.
- Test organizer waitlist promotion.
- Test annual retreat payment webhook in a Hi.Events/Stripe test mode environment.
- Test backups and restore.
- Publish privacy, conduct, and refund policy drafts.

## Phase 8: Annual Retreat Readiness

- Finalize event details and capacity.
- Finalize surveys and preference questions.
- Finalize payment/refund policy.
- Confirm check-in approach.
- Confirm organizer escalation and safety process.
- Run a production rehearsal before opening paid registration.
