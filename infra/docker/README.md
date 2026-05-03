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

The ARF Compose file creates the shared `arf_edge` network. Event registration
is owned by the ARF app for the MVP, so no separate event-service hostname is
required.

## Unraid Compose

For Unraid, use `compose.unraid.yml` and keep persistent data under `/mnt/user/appdata/arf`.

Suggested layout:

```text
/mnt/user/appdata/arf/.env
/mnt/user/appdata/arf/source
/mnt/user/appdata/arf/postgres
/mnt/user/appdata/arf/redis
/mnt/user/appdata/arf/backups
```

Clone this repository to `/mnt/user/appdata/arf/source`, copy `env.unraid.example` to `/mnt/user/appdata/arf/.env`, fill in the secrets, then deploy with:

```sh
docker compose --env-file /mnt/user/appdata/arf/.env \
  -f /mnt/user/appdata/arf/source/infra/docker/compose.unraid.yml \
  --profile tools run --rm arf-migrate

docker compose --env-file /mnt/user/appdata/arf/.env \
  -f /mnt/user/appdata/arf/source/infra/docker/compose.unraid.yml \
  up -d --build
```

No host ports are published by default. The included `cloudflared` container joins the `arf_edge` Docker network and routes traffic directly to `http://arf-web:3000`.
