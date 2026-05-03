# Community Event Group Orchestrator

Community Event Group Orchestrator, or cego, is a Telegram-first event and member system for private communities that run capacity-limited events, local meetups, surveys, and organizer-managed member workflows.

This repository started as a documentation-first project. The implementation target is an open source, self-hosted stack built around a custom cego app, Telegram Mini App and browser Telegram SSO authentication, built-in member CRM-lite tools, cego-owned event registration flows, Docker Compose, cloudflared, and Cloudflare Access.

## Status

Working MVP scaffold. The repository includes the documentation pack, a Next.js TypeScript cego app, Telegram Mini App and Telegram Login Widget session persistence, event/RSVP management, built-in surveys, CRM-lite member admin, organizer admin views, and Docker development/production infrastructure for cego-owned services.

## Development

Install cego web app dependencies:

```sh
npm --prefix apps/cego-web install
```

Run the web app:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run test
npm run typecheck
npm run build
```

Validate the production Docker Compose scaffold:

```sh
cp infra/docker/env.production.example .env
npm run docker:prod:config
```

## Core Decisions

- Telegram is the primary identity provider.
- cego does not create a separate password account.
- cego stores a signed session cookie after Telegram Mini App verification or Telegram Login Widget browser sign-in.
- Telegram group membership gates event access.
- Events accept group-member RSVPs until the capacity cap is reached.
- After capacity, new requests go to a manual waitlist.
- Major event registration starts as RSVP and organizer approval, with cego-native payment work deferred until needed.
- Local events use free RSVP in v1.
- cego owns surveys and preferences.
- Telegram bot notifications are the primary communication channel.
- cego-specific code is licensed AGPLv3.

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
- [Telegram Bot Setup](docs/10-bot-setup.md)
- [UI And Admin Iteration Plan](docs/11-ui-admin-iteration-plan.md)

## Target Domains

- `cego.example.com`: public site, Telegram Mini App, member dashboard, organizer admin
- `api.cego.example.com`: cego backend routes and webhooks, unless folded into the Next.js app

## Primary References

- [Telegram Mini Apps](https://docs.telegram-mini-apps.com/)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
