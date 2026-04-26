# ARF Web

Next.js TypeScript app for Anthro Retreat Florida.

This app will own:

- Public ARF site.
- Telegram Mini App entry point.
- Member dashboard.
- Organizer admin shell.
- ARF API routes if the backend remains monolithic.

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

The production target is `arf.kurue.com` behind cloudflared.

Admin routes must be protected by Cloudflare Access and ARF app-level organizer roles before real event data is stored.
