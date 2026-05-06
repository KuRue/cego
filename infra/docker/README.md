# Docker Infrastructure

This directory holds Compose files and deployment notes for the self-hosted cego stack.

The development Compose file starts only the shared services needed by the custom cego app:

- Postgres for cego data.
- Redis for queues/cache.

The production Compose file builds the cego web app, runs cego Postgres and Redis, exposes the app only through cloudflared, and includes manual migration/backup tool profiles. External CRM services are deferred while cego grows built-in member admin tools.

The stack also includes `cego-deadline-worker`, a small internal loop that calls the protected cego task endpoint every minute by default. This is what expires unpaid RSVPs after their payment deadline and advances the waitlist without waiting for someone to load the dashboard.

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

Start the cego production stack:

```sh
npm run docker:prod
```

Create a manual cego Postgres backup:

```sh
npm run docker:prod:backup
```

## Prebuilt Images

The fastest self-hosted deploy path is to let GitHub Actions build the web and migration images, then have the server pull them from GHCR. This avoids running the Next.js production build on Unraid or a small VPS.

Images published by the workflow:

- `ghcr.io/kurue/cego-web`
- `ghcr.io/kurue/cego-migrate`

The workflow publishes branch, tag, SHA, and default-branch `latest` tags. For a deployment branch, set `CEGO_WEB_IMAGE` and `CEGO_MIGRATOR_IMAGE` to that branch tag, such as `ghcr.io/kurue/cego-web:codex-rebrand-cego`. After merging to the default branch, `latest` is the simple production tag.

If GHCR keeps the packages private, either make the packages public in GitHub or run `docker login ghcr.io` on the server with a token that has `read:packages`.

## Cloudflare Tunnel Routes

The production stack uses a remotely-managed Cloudflare Tunnel token. Configure these public hostnames in the Cloudflare dashboard for the tunnel:

- `cego.example.com` -> `http://cego-web:3000`
- `api.cego.example.com` -> `http://cego-web:3000`

The cego Compose file creates the shared `cego_edge` network. Event registration
is owned by the cego app for the MVP, so no separate event-service hostname is
required.

## Unraid Compose

For Unraid, use `compose.unraid.yml` and keep persistent data under `/mnt/user/appdata/cego`.

Suggested layout:

```text
/mnt/user/appdata/cego/.env
/mnt/user/appdata/cego/source
/mnt/user/appdata/cego/postgres
/mnt/user/appdata/cego/redis
/mnt/user/appdata/cego/backups
```

Clone this repository to `/mnt/user/appdata/cego/source`, copy `env.unraid.example` to `/mnt/user/appdata/cego/.env`, fill in the secrets, then deploy with:

```sh
docker compose --env-file /mnt/user/appdata/cego/.env \
  -f /mnt/user/appdata/cego/source/infra/docker/compose.unraid.yml \
  --profile tools run --rm cego-migrate

docker compose --env-file /mnt/user/appdata/cego/.env \
  -f /mnt/user/appdata/cego/source/infra/docker/compose.unraid.yml \
  up -d --build
```

No host ports are published by default. The included `cloudflared` container joins the `cego_edge` Docker network and routes traffic directly to `http://cego-web:3000`.

For faster Unraid deploys using prebuilt GHCR images, use the standalone prebuilt Compose file and omit `--build`:

```sh
docker compose --env-file /mnt/user/appdata/cego/.env \
  -f /mnt/user/appdata/cego/source/infra/docker/compose.unraid.prebuilt.yml \
  pull cego-web cego-migrate

docker compose --env-file /mnt/user/appdata/cego/.env \
  -f /mnt/user/appdata/cego/source/infra/docker/compose.unraid.prebuilt.yml \
  --profile tools run --rm cego-migrate

docker compose --env-file /mnt/user/appdata/cego/.env \
  -f /mnt/user/appdata/cego/source/infra/docker/compose.unraid.prebuilt.yml \
  up -d
```

After the source directory has this script, the same deploy can be run as one command:

```sh
bash /mnt/user/appdata/cego/source/infra/docker/deploy-unraid-prebuilt.sh
```

The script infers the appdata directory from its location, so it also works for a legacy path such as `/mnt/user/appdata/arf/source`:

```sh
bash /mnt/user/appdata/arf/source/infra/docker/deploy-unraid-prebuilt.sh
```

Optional overrides:

- `CEGO_DEPLOY_BRANCH=main`
- `CEGO_ENV_FILE=/mnt/user/appdata/arf/.env`
- `CEGO_COMPOSE_FILE=/mnt/user/appdata/arf/source/infra/docker/compose.unraid.prebuilt.yml`
