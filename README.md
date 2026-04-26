# Anthro Retreat Florida

Anthro Retreat Florida, or ARF, is a Telegram-first event and member system for an annual Florida short-term-rental retreat and smaller local mini retreats.

This repository starts as a documentation-first project. The implementation target is an open source, self-hosted stack built around a custom ARF app, Telegram Mini App authentication, built-in member CRM-lite tools, Hi.Events for ticketing/payment, Docker Compose, cloudflared, and Cloudflare Access.

## Status

Planning and technical scaffold. The repository now includes the documentation pack, a Next.js TypeScript ARF app shell, and early Docker development infrastructure for ARF-owned services.

## Development

Install ARF web app dependencies:

```sh
npm --prefix apps/arf-web install
```

Run the web app:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run typecheck
```

## Core Decisions

- Telegram is the primary identity provider.
- ARF does not create a separate password account.
- Telegram group membership gates event access.
- Events accept group-member RSVPs until the capacity cap is reached.
- After capacity, new requests go to a manual waitlist.
- Annual retreat registration starts as RSVP, then moves to Hi.Events payment/registration after organizer approval.
- Mini retreats use free RSVP in v1.
- ARF owns surveys and preferences.
- Telegram bot notifications are the primary communication channel.
- ARF-specific code is licensed AGPLv3.

## Documentation

- [Vision](docs/01-vision.md)
- [Product Spec](docs/02-product-spec.md)
- [Architecture](docs/03-architecture.md)
- [Data Model](docs/04-data-model.md)
- [Integrations](docs/05-integrations.md)
- [Deployment](docs/06-deployment.md)
- [Security and Privacy](docs/07-security-privacy.md)
- [Community Policy](docs/08-community-policy.md)
- [Roadmap](docs/09-roadmap.md)

## Target Domains

- `arf.kurue.com`: public site, Telegram Mini App, member dashboard, organizer admin
- `api.arf.kurue.com`: ARF backend routes and webhooks, unless folded into the Next.js app
- `events.arf.kurue.com`: Hi.Events

## Primary References

- [Hi.Events](https://github.com/HiEventsDev/hi.events)
- [Hi.Events webhooks](https://hi.events/docs/help-center/customization-and-settings/webhooks)
- [Telegram Mini Apps](https://docs.telegram-mini-apps.com/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
