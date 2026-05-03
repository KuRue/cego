# cego Web

Next.js TypeScript app for Community Event Group Orchestrator.

This app will own:

- Public cego site.
- Telegram Mini App entry point.
- Member dashboard.
- Organizer admin shell.
- cego API routes if the backend remains monolithic.

## Getting Started

From the repository root:

```sh
npm run dev
```

Or from this app directory:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

## Deployment Target

The production target is `cego.example.com` behind cloudflared.

Admin routes must be protected by Cloudflare Access and cego app-level organizer roles before real event data is stored.
