# Docker Infrastructure

This directory holds Compose files and deployment notes for the self-hosted ARF stack.

The development Compose file starts only the shared services needed by the custom ARF app:

- Postgres for ARF data.
- Redis for queues/cache.

The production Compose file builds the ARF web app, runs ARF Postgres and Redis, exposes the app only through cloudflared, and includes manual migration/backup tool profiles. External CRM services are deferred while ARF grows built-in member admin tools.

## Local Development

Copy the example environment and fill in local values:

```sh
cp .env.example .env
```

Start local services:

```sh
npm run docker:dev
```

## Production Scaffold

Copy the production template to the deployment host root as `.env`:

```sh
cp infra/docker/env.production.example .env
```

Validate the production Compose model:

```sh
npm run docker:prod:config
```

Run database migrations before starting or after pulling schema changes:

```sh
npm run docker:prod:migrate
```

Start the ARF production stack:

```sh
npm run docker:prod
```

Create a manual ARF Postgres backup:

```sh
npm run docker:prod:backup
```

## Cloudflare Tunnel Routes

The production stack uses a remotely-managed Cloudflare Tunnel token. Configure these public hostnames in the Cloudflare dashboard for the tunnel:

- `arf.kurue.com` -> `http://arf-web:3000`
- `api.arf.kurue.com` -> `http://arf-web:3000`
- `events.arf.kurue.com` -> the Hi.Events service attached to the `arf_edge` Docker network, for example `http://hi-events:80`

The ARF Compose file creates the shared `arf_edge` network. If Hi.Events is run from its upstream Compose project, attach its public HTTP service to that same Docker network and give it the alias used in the Cloudflare route.
