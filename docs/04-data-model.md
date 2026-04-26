# Data Model

This document defines the minimum ARF-owned entities. Exact database column names can change during implementation, but the ownership and state model should remain stable.

## `members`

Represents a Telegram-backed ARF account.

Required fields:

- `id`
- `telegram_id`
- `telegram_username`
- `telegram_display_name`
- `telegram_photo_url`
- `email`
- `group_status`: `member`, `not_member`, `unknown`
- `is_admin`
- `crm_contact_id`
- `created_at`
- `updated_at`

Notes:

- `telegram_id` is the stable identity key.
- Email is collected for event/payment needs, not for password login.
- ARF should not store Telegram auth payloads longer than needed for verification/debugging.

## `events`

Represents an annual retreat or mini retreat.

Required fields:

- `id`
- `type`: `annual_retreat` or `mini_retreat`
- `title`
- `slug`
- `starts_at`
- `ends_at`
- `location_text`
- `capacity`
- `status`: `draft`, `open`, `full`, `closed`, `archived`
- `hi_events_event_id`
- `created_at`
- `updated_at`

Notes:

- `hi_events_event_id` is optional and expected mainly for annual retreats.
- Exact rental addresses should be treated as sensitive and shown only to approved attendees when appropriate.

## `rsvps`

Links a member to an event.

Required fields:

- `id`
- `member_id`
- `event_id`
- `status`: `confirmed`, `waitlisted`, `approved_to_pay`, `paid_registered`, `cancelled`
- `hi_events_order_id`
- `hi_events_attendee_id`
- `ticket_type`
- `checked_in_at`
- `created_at`
- `updated_at`

Rules:

- A member can have at most one active RSVP per event.
- Under-cap RSVPs become `confirmed`.
- Over-cap RSVPs become `waitlisted`.
- Annual retreat payment eligibility is represented by `approved_to_pay`.
- Hi.Events webhook completion moves annual retreat RSVP to `paid_registered`.
- Mini retreats do not require `paid_registered` in v1.

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

## `crm_sync_log`

Tracks sync attempts to EspoCRM.

Required fields:

- `id`
- `member_id`
- `event_id`
- `operation`
- `status`: `pending`, `success`, `failed`
- `remote_id`
- `error_message`
- `created_at`
- `updated_at`

## CRM Field Mapping

Minimum EspoCRM contact fields:

- Telegram ID
- Telegram username
- Display name
- Email
- Group status
- Latest RSVP event
- Latest RSVP status
- Event attendance tags
- Organizer notes

ARF remains the source of truth for live RSVP status. EspoCRM stores searchable CRM context and organizer notes.

