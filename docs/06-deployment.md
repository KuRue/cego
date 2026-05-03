# Deployment

## Target Environment

The target v1 deployment is one Linux VPS running Docker Compose. Public traffic is routed through cloudflared. No inbound application ports need to be exposed directly to the internet.

## Compose Services

Implemented ARF-owned service groups:

- `cloudflared`: Cloudflare Tunnel connector.
- `arf-web`: Next.js ARF public site, Mini App, dashboard, API routes if monolithic.
- `arf-postgres`: ARF database.
- `arf-redis`: queue/cache if needed.
- `arf-migrate`: manual migration tool profile.
- `arf-postgres-backup`: manual backup tool profile.

Deferred or external service groups:

- `arf-worker`: async jobs, Telegram notifications, CRM-lite reminders/rollups, and future payment reconciliation.

## Network Exposure

Only cloudflared should publish ARF services externally.

Internal service routing:

- `arf.kurue.com` -> `arf-web`
- `api.arf.kurue.com` -> `arf-web` or `arf-api`

The production Compose scaffold uses a remotely-managed tunnel token. Configure Cloudflare Tunnel public hostnames to point at container DNS names, such as `http://arf-web:3000` for both ARF hostnames.

## Environment Variables

ARF app:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `ARF_ADMIN_TELEGRAM_IDS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_GROUP_ID`
- `TELEGRAM_WEBAPP_URL`
- `APP_BASE_URL`
- `SOURCE_CODE_URL`
- `ARF_POSTGRES_DB`
- `ARF_POSTGRES_USER`
- `ARF_POSTGRES_PASSWORD`

cloudflared:

- `TUNNEL_TOKEN` or mounted tunnel credentials, depending on tunnel management mode.

## Backups

Backups should include:

- ARF Postgres database.
- Uploaded files or persistent app volumes.
- cloudflared configuration if locally managed.
- Compose configuration and environment templates, without secrets.

Minimum backup behavior:

- Daily encrypted database backups.
- Retention policy with recent daily and longer monthly backups.
- Restore instructions tested before annual retreat launch.

The current Compose scaffold includes a manual ARF Postgres backup tool profile. Scheduled encrypted backups and restore drills are still launch-readiness work.

## Deployment Acceptance

- `arf.kurue.com` loads the ARF app over HTTPS.
- Telegram Mini App can launch `arf.kurue.com`.
- ARF admin routes require Cloudflare Access and app admin role.
- Direct database and internal service ports are not internet-exposed.
- Backups can be listed and restored in a test environment.
