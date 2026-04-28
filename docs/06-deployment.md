# Deployment

## Target Environment

The target v1 deployment is one Linux VPS running Docker Compose. Public traffic is routed through cloudflared. No inbound application ports need to be exposed directly to the internet.

## Compose Services

Planned service groups:

- `cloudflared`: Cloudflare Tunnel connector.
- `arf-web`: Next.js ARF public site, Mini App, dashboard, API routes if monolithic.
- `arf-worker`: async jobs, webhook retries, Telegram notifications, CRM-lite reminders/rollups.
- `arf-postgres`: ARF database.
- `arf-redis`: queue/cache if needed.
- `hi-events`: Hi.Events service group, following upstream deployment guidance.
- `hievents-db`: Hi.Events database.
- `hievents-redis`: Hi.Events cache/queue if required.
- `backup`: scheduled backup job.

## Network Exposure

Only cloudflared should publish ARF services externally.

Internal service routing:

- `arf.kurue.com` -> `arf-web`
- `api.arf.kurue.com` -> `arf-web` or `arf-api`
- `events.arf.kurue.com` -> Hi.Events frontend/backend entrypoint

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
- `HI_EVENTS_BASE_URL`
- `HI_EVENTS_API_KEY`
- `HI_EVENTS_WEBHOOK_SECRET`
- `HI_EVENTS_CHECKOUT_URL_TEMPLATE`
- `APP_BASE_URL`
- `SOURCE_CODE_URL`

cloudflared:

- `TUNNEL_TOKEN` or mounted tunnel credentials, depending on tunnel management mode.

Hi.Events:

- Use upstream required environment variables.
- Stripe configuration remains inside Hi.Events.

## Backups

Backups should include:

- ARF Postgres database.
- Hi.Events database.
- Uploaded files or persistent app volumes.
- cloudflared configuration if locally managed.
- Compose configuration and environment templates, without secrets.

Minimum backup behavior:

- Daily encrypted database backups.
- Retention policy with recent daily and longer monthly backups.
- Restore instructions tested before annual retreat launch.

## Deployment Acceptance

- `arf.kurue.com` loads the ARF app over HTTPS.
- Telegram Mini App can launch `arf.kurue.com`.
- `events.arf.kurue.com` loads Hi.Events over HTTPS.
- ARF admin routes require Cloudflare Access and app admin role.
- Direct database and internal service ports are not internet-exposed.
- Backups can be listed and restored in a test environment.
