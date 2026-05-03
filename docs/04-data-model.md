# Data Model

This document defines the minimum cego-owned entities. Exact database column names can change during implementation, but the ownership and state model should remain stable.

## `members`

Represents a Telegram-backed cego account.

Required fields:

- `id`
- `telegram_id`
- `telegram_username`
- `telegram_display_name`
- `telegram_photo_url`
- `email`
- `group_status`: `member`, `not_member`, `unknown`
- `is_admin`
- `created_at`
- `updated_at`

Notes:

- `telegram_id` is the stable identity key.
- Email is collected for event/payment needs, not for password login.
- cego should not store Telegram auth payloads longer than needed for verification/debugging.

## `events`

Represents a major event or local event.

Required fields:

- `id`
- `type`: `major_event` or `local_event`
- `title`
- `slug`
- `description`
- `starts_at`
- `ends_at`
- `location_text`
- `price_cents`
- `currency`
- `payment_required`
- `rules_text`
- `terms_text`
- `refund_policy_text`
- `organizer_notes`
- `capacity`
- `status`: `draft`, `open`, `full`, `closed`, `archived`
- `created_at`
- `updated_at`

Notes:

- Exact private event addresses should be treated as sensitive and shown only to approved attendees when appropriate.
- `description`, `price_cents`, `currency`, `payment_required`, `rules_text`, `terms_text`, and `refund_policy_text` are member-facing when present.
- `organizer_notes` is internal organizer metadata and must not be shown on normal member dashboards.
- cego stores event price metadata only in this slice; payment collection remains deferred until direct Stripe work.

## `rsvps`

Links a member to an event.

Required fields:

- `id`
- `member_id`
- `event_id`
- `status`: `confirmed`, `waitlisted`, `cancelled`
- `ticket_type`
- `checked_in_at`
- `created_at`
- `updated_at`

Rules:

- A member can have at most one active RSVP per event.
- Under-cap RSVPs become `confirmed`.
- Over-cap RSVPs become `waitlisted`.
- `confirmed` counts against capacity.
- `cancelled` does not auto-promote another waitlisted member.
- Future direct Stripe work should add cego-native payment tables and store only operational payment status and Stripe IDs needed for reconciliation, never payment method data.

## `surveys`

Defines a profile or event survey.

Required fields:

- `id`
- `event_id`
- `title`
- `description`
- `status`: `draft`, `published`, `closed`
- `schema_json`
- `created_at`
- `updated_at`

Notes:

- `event_id` is nullable for general member preference surveys.
- `schema_json` stores question definitions, required flags, answer types, and display order.

## `survey_responses`

Stores submitted answers.

Required fields:

- `id`
- `survey_id`
- `member_id`
- `event_id`
- `answers_json`
- `submitted_at`
- `updated_at`

Rules:

- A response must always belong to a member.
- Event survey responses should also store `event_id` for easier reporting.
- Sensitive answers, such as accessibility or dietary needs, should be visible only to organizers.

## `notifications`

Audits outbound Telegram notifications.

Required fields:

- `id`
- `member_id`
- `event_id`
- `telegram_chat_id`
- `telegram_message_id`
- `template_key`
- `status`: `queued`, `sent`, `failed`
- `error_message`
- `created_at`
- `sent_at`

## `member_tags`

Defines organizer-managed tags for lightweight CRM filtering.

Required fields:

- `id`
- `name`
- `color`
- `created_at`
- `updated_at`

Rules:

- Tag names should be unique.
- Tags are internal organizer metadata, not member-facing profile data by default.

## `member_tag_assignments`

Links tags to members.

Required fields:

- `member_id`
- `tag_id`
- `created_at`

Rules:

- A member can receive a tag only once.
- Removing a member or tag removes the assignment.

## `member_notes`

Stores organizer notes for member follow-up and event planning context.

Required fields:

- `id`
- `member_id`
- `author_member_id`
- `body`
- `created_at`
- `updated_at`

Rules:

- Notes are visible only to organizers.
- Notes should not store payment method data or unnecessary legal identity information.
- Attendance history is derived from `rsvps`; notes and tags provide organizer context.
