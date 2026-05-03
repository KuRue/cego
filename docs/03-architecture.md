# Architecture

## Stack

- cego app: Next.js with TypeScript.
- cego database: Postgres.
- Background work: cego worker process or scheduled jobs in the app container.
- Identity: Telegram Mini App signed init data.
- Notifications: Telegram bot.
- Ticketing/payment: cego-owned approval and registration state, with direct Stripe checkout deferred until needed.
- CRM-lite: cego-owned member notes, tags, and attendance history.
- Deployment: Docker Compose on a single VPS.
- Public ingress: cloudflared.
- Admin perimeter: Cloudflare Access.

## Service Diagram

```mermaid
flowchart LR
  TG["Telegram Group"] --> BOT["Telegram Bot"]
  BOT --> APP["cego Mini App / Web"]
  APP --> API["cego API"]
  API --> DB["cego Postgres"]
  CF["cloudflared"] --> APP
  CF --> API
```

## Ownership Boundaries

### cego App

cego owns identity linking, group-membership checks, member profiles, event discovery, RSVP state, waitlists, surveys, organizer admin, CRM-lite context, and future registration/payment state.

### cego CRM-lite

cego owns member notes, organizer tags, attendance history summaries, and follow-up views in the same Postgres database as event data. External CRM integration is deferred until the built-in admin workflows are insufficient.

### Telegram

Telegram owns chat, Mini App launch context, Telegram user identity, group membership source checks, and bot message delivery.

### Cloudflare

Cloudflare owns DNS, tunnel ingress, TLS termination, WAF-level protection, and Cloudflare Access for admin surfaces.

## Domain Map

- `cego.example.com`: public site, Telegram Mini App, member dashboard, organizer admin.
- `api.cego.example.com`: cego backend routes and webhooks, unless folded into the Next.js app.

## Runtime Shape

The v1 Compose stack should run:

- `cego-web`: Next.js app and API routes.
- `cego-worker`: background jobs, CRM-lite reminders/rollups, Telegram notification queue, and future payment reconciliation jobs.
- `cego-postgres`: cego database.
- `cego-redis`: queues and short-lived cache if required by the app.
- `cloudflared`: tunnel connector.
- `backup`: scheduled database and upload backup job.
