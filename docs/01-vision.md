# Vision

## Purpose

Community Event Group Orchestrator, or cego, is a reusable operations system for private communities that organize capacity-limited events and smaller local gatherings. It helps organizers plan shared activities, collect attendee preferences, coordinate attendance, and keep identity tied to the Telegram group where the community already lives.

cego should feel like a lightweight community operations system, not a public convention platform. The system exists to help trusted group members understand events, RSVP, join waitlists, fill out surveys, receive updates, and complete paid registration when needed.

## Audience

The primary audience is friends and invited community members who already coordinate through Telegram. The secondary audience is organizers who need enough structure to manage capacity, preferences, payments, and follow-up without maintaining scattered spreadsheets and chat threads.

## Event Types

### Major Event

The major event is the main planned gathering for a community. It is expected to have fixed capacity, attendee preferences, possible deposits or paid tickets, and organizer review before payment access.

### Local Events

Local events are smaller local meets organized through the same member system. In v1, local events use free RSVP, capacity handling, surveys, and Telegram reminders. Paid flows are not required for local events by default.

## Principles

- Telegram-first: members should not need another password account.
- Self-hosted: cego-owned services should run on infrastructure controlled by the organizers.
- Open source: cego-specific code should be AGPLv3.
- Practical operations: the system should reduce organizer work rather than create ceremonial process.
- Privacy-aware: collect only information needed to run events safely and respectfully.
- Extensible: the system should support yearly events, recurring local meets, surveys, member history, and later automation.
