# UI And Admin Iteration Plan

This document tracks the next cego usability and admin-workflow pass. It is intentionally written as an iteration checklist so we can update status as each slice lands.

## Current Problems To Resolve

- Profile page navigation shows a generic "failed to load" error.
- Saving settings currently routes to a 404.
- Settings should live inside the admin area instead of feeling like a separate surface.
- Event and survey creation forms take too much space by default.
- Event records need richer configuration fields before real use.
- The current visual style is functional but not the intended sleek, modern, liquid-glass direction.

## Product Direction

cego should feel like a polished private community operations tool: compact enough for repeated organizer work, but modern enough that members trust it as the main event surface.

The UI direction should be:

- Sleek, modern, and glass-influenced.
- Subtle translucency, layered surfaces, restrained blur, and crisp borders.
- High-contrast readable text over any translucent backgrounds.
- Practical dashboard density for admin views.
- Mobile-safe layouts with no overlapping text or oversized cards.
- No decorative-only clutter that gets in the way of RSVP, profile, survey, or admin workflows.

## Phase 1: Bug Triage And Routing

Goal: make existing navigation dependable before redesigning.

Tasks:

- Reproduce the profile page "failed to load" error in the browser.
- Identify whether the profile failure is a missing route, server error, auth/session issue, data fetch issue, or Mini App navigation issue.
- Add or fix the member profile route.
- Add clear empty/error states for unauthenticated, non-member, and missing-profile cases.
- Reproduce the settings save 404.
- Move settings actions/routes under the admin area.
- Ensure settings forms redirect back to the correct admin tab or section after save.

Acceptance checks:

- A signed-in member can open their profile without a generic failed-load state.
- A non-signed-in user is redirected to sign-in or shown a clear access state.
- Admin settings save without 404.
- Invalid settings submissions show a useful failure state or return to admin safely.

## Phase 2: Admin Information Architecture

Goal: make admin feel like one cohesive operations console.

Tasks:

- Put settings on the admin page or under an admin tab/section.
- Organize admin into clear sections: Events, Surveys, Members, Settings, Diagnostics.
- Keep event and survey lists visible without forcing all create/edit fields to be open.
- Convert create event and create survey into collapsed panels by default.
- Reveal create fields only after clicking "Create event" or "Create survey".
- Keep edit forms compact, ideally collapsed per item or opened only for the selected item.
- Preserve current server-action behavior while changing presentation.

Acceptance checks:

- Admin landing page is scannable on desktop and mobile.
- Create event starts collapsed and expands when requested.
- Create survey starts collapsed and expands when requested.
- Existing event RSVP review remains easy to find.
- Settings are reachable from admin without leaving the organizer workflow.

## Phase 3: Event Configuration Expansion

Goal: support richer event setup without needing external event software.

Candidate event fields:

- Public description.
- Organizer-only notes.
- Price or price label.
- Currency.
- Payment required flag.
- Registration terms.
- Event rules.
- Cancellation/refund policy text.
- Capacity.
- Location text.
- Private address or private location notes for approved attendees later.
- Visibility/status controls.
- Optional RSVP open/close dates.

Implementation notes:

- Add fields through migrations only when the UI contract is clear.
- Separate public/member-facing text from organizer-only notes.
- Do not store payment method data.
- Keep payment collection deferred until the Stripe slice.
- Consider Markdown or plain textarea fields for rules, terms, and descriptions.

Acceptance checks:

- Organizer can create and edit an event with description, rules, terms, and price metadata.
- Member dashboard shows only member-safe event details.
- Organizer-only fields do not appear to normal members.
- Existing RSVP capacity behavior still works.

## Phase 4: Member Profile And Settings

Goal: give members and organizers dependable profile surfaces.

Member profile should include:

- Telegram identity.
- Display name and username.
- Group status.
- Optional email/contact field.
- RSVP history.
- Survey completion summary.
- Member-facing settings as needed.

Admin member profile should include:

- Telegram identity.
- Email/contact.
- RSVP history.
- Survey responses.
- Tags.
- Organizer notes.
- Admin-only status and diagnostics where useful.

Acceptance checks:

- Member profile works in normal browser and Mini App contexts.
- Admin can open a member profile from the member directory.
- Settings save flow never routes to a missing page.
- Profile data shown to members excludes organizer-only notes and tags unless explicitly intended.

## Phase 5: Liquid Glass Visual Refresh

Goal: apply the new visual direction after core flows are stable.

Design requirements:

- Define shared theme tokens for background, surfaces, borders, shadows, text, and accents.
- Use translucent panels selectively for top-level surfaces.
- Keep cards at restrained radius and avoid nested card stacks.
- Use clear icon/button controls where appropriate.
- Keep tables/lists readable and dense enough for admin use.
- Validate desktop and mobile screenshots after implementation.

Candidate surfaces:

- Public home page.
- Sign-in page.
- Mini App session page.
- Member dashboard.
- Admin shell and section navigation.
- Event and survey list items.
- Member directory and member detail.
- Settings panel.

Acceptance checks:

- No text overlap on mobile or desktop.
- Buttons and form controls remain readable on translucent surfaces.
- Admin workflows remain faster to scan than a marketing page.
- Browser screenshots confirm the theme is applied consistently.

## Phase 6: Follow-Up Slices

Potential later work:

- Direct Stripe Checkout for paid major events.
- Private attendee-only event details.
- Telegram notifications for RSVP, waitlist, surveys, and reminders.
- Import/export tools for events and members.
- Better audit log for admin changes.
- Multi-group support if cego needs to host more than one Telegram community in one deployment.

## Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Bug triage and routing | In progress | Profile now has an explicit signed-out state and avoids Next image host issues for Telegram avatars; settings saves redirect back to `/admin#settings`. |
| Phase 2: Admin information architecture | In progress | Settings live on the admin page; create/edit event and survey forms are collapsed with native details panels. |
| Phase 3: Event configuration expansion | In progress | Events now include description, price metadata, rules, terms, cancellation/refund policy, and organizer notes. |
| Phase 4: Member profile and settings | In progress | Profile shows Telegram identity, group status, role, join date, and editable contact email. |
| Phase 5: Liquid glass visual refresh | In progress | Shared liquid-glass tokens, page shell background treatment, focus states, and admin navigation polish have started. |
| Phase 6: Follow-up slices | Backlog | Use after MVP usability is solid. |
