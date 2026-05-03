# Product Spec

## Roles

- Member: a Telegram group member who can access cego event flows.
- Waitlisted member: a group member who requested an event after capacity was reached.
- Organizer: a trusted admin who can manage events, waitlists, surveys, approvals, and member state.
- System: cego backend, Telegram bot, internal CRM-lite records, and background jobs.

## Member Flow

1. A member opens cego through a normal browser link, Telegram bot button, or Mini App link.
2. Browser users sign in with Telegram Login Widget; Mini App users send signed Telegram init data to cego.
3. cego verifies the Telegram identity and checks membership in the configured Telegram group.
4. If the user is a group member, cego creates or updates the member profile.
5. The member sees active major events and local events.
6. The member can complete required profile fields and event surveys.
7. The member can RSVP to an event.
8. If the event is under capacity, the RSVP becomes `confirmed`.
9. If the event is at capacity, the RSVP becomes `waitlisted`.

## Major Event Flow

The major event starts with RSVP and organizer review. Payment collection is a cego-native later slice and is not part of the current MVP.

1. Member submits RSVP.
2. cego assigns `confirmed` or `waitlisted` based on event capacity.
3. Organizer reviews confirmed and waitlisted members as needed.
4. Organizer uses member email, tags, notes, and survey responses for planning.
5. Organizer manually adjusts RSVP state when a member should be confirmed, waitlisted, or cancelled.
6. Later cego-native payment work can add organizer-approved checkout without sending members to a separate event site.

## Local Event Flow

Local events use the same Telegram identity, capacity, RSVP, survey, and notification system. In v1, local events do not require checkout.

1. Member submits RSVP.
2. cego assigns `confirmed` or `waitlisted`.
3. cego sends Telegram confirmation or waitlist notification.
4. Organizer can message attendees and export attendance information.

## Organizer Flow

Organizers use cego admin to:

- Create and edit major event and local event records.
- Set event dates, location text, capacity, and status.
- Review confirmed and waitlisted RSVPs.
- Create and publish surveys.
- Review survey completion status.
- Trigger Telegram notifications.
- Add member notes and tags for organizer follow-up.
- Monitor notification and sync status.

## RSVP Statuses

- `confirmed`: the member is inside the event cap.
- `waitlisted`: the event cap has been reached and organizer action is needed.
- `cancelled`: member or organizer cancelled the RSVP.

## Acceptance Scenarios

- Telegram group member can open the Mini App and create or update their cego profile.
- Telegram group member can sign in from a normal browser with Telegram Login Widget and create or update their cego profile.
- Non-group Telegram user is blocked from RSVP flows.
- Major event RSVP under cap becomes `confirmed`.
- Major event RSVP over cap becomes `waitlisted`.
- Organizer can review and change RSVP states from cego admin.
- Local event RSVP works without checkout.
- Survey response attaches to member and event.
- Organizer can add member notes and tags from cego admin.
- cego admin is protected by Cloudflare Access plus app-level roles.
- Docker Compose exposes only intended services through cloudflared.
