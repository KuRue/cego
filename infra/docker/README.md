# Docker Infrastructure

This directory holds Compose files and deployment notes for the self-hosted ARF stack.

The first development Compose file starts only the shared services needed by the custom ARF app:

- Postgres for ARF data.
- Redis for queues/cache.

Hi.Events, EspoCRM, and cloudflared should be added after the ARF app boots cleanly and the first Telegram/RSVP vertical slice is ready.

## Local Development

Copy the example environment and fill in local values:

```sh
cp .env.example .env
```

Start local services:

```sh
npm run docker:dev
```

