# Deployment

## Target Environment

The target v1 deployment is one Linux VPS running Docker Compose. Public traffic is routed through cloudflared. No inbound application ports need to be exposed directly to the internet.

## Compose Services

Implemented cego-owned service groups:

- `cloudflared`: Cloudflare Tunnel connector.
- `cego-web`: Next.js cego public site, Mini App, dashboard, API routes if monolithic.
- `cego-postgres`: cego database.
- `cego-redis`: queue/cache if needed.
- `cego-migrate`: manual migration tool profile.
- `cego-postgres-backup`: manual backup tool profile.

Deferred or external service groups:

- `cego-worker`: async jobs, Telegram notifications, CRM-lite reminders/rollups, and future payment reconciliation.

## Network Exposure

Only cloudflared should publish cego services externally.

Internal service routing:

- `cego.example.com` -> `cego-web`
- `api.cego.example.com` -> `cego-web` or `cego-api`

The production Compose scaffold uses a remotely-managed tunnel token. Configure Cloudflare Tunnel public hostnames to point at container DNS names, such as `http://cego-web:3000` for both cego hostnames.

## Environment Variables

cego app:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `CEGO_ADMIN_TELEGRAM_IDS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_GROUP_ID`
- `TELEGRAM_WEBAPP_URL`
- `APP_BASE_URL`
- `SOURCE_CODE_URL`
- `CEGO_POSTGRES_DB`
- `CEGO_POSTGRES_USER`
- `CEGO_POSTGRES_PASSWORD`

cloudflared:

- `TUNNEL_TOKEN` or mounted tunnel credentials, depending on tunnel management mode.

## Backups

Backups should include:

- cego Postgres database.
- Uploaded files or persistent app volumes.
- cloudflared configuration if locally managed.
- Compose configuration and environment templates, without secrets.

Minimum backup behavior:

- Daily encrypted database backups.
- Retention policy with recent daily and longer monthly backups.
- Restore instructions tested before major event launch.

The current Compose scaffold includes a manual cego Postgres backup tool profile. Scheduled encrypted backups and restore drills are still launch-readiness work.

## Deployment Acceptance

- `cego.example.com` loads the cego app over HTTPS.
- Telegram Mini App can launch `cego.example.com`.
- cego admin routes require Cloudflare Access and app admin role.
- Direct database and internal service ports are not internet-exposed.
- Backups can be listed and restored in a test environment.
