# Contributing

ARF is currently a planning-first project. Early contributions should keep implementation aligned with the documented product and architecture decisions.

## Development Principles

- Keep Telegram as the primary identity provider.
- Keep ARF as the source of truth for member, RSVP, waitlist, survey, and registration state.
- Keep v1 CRM behavior inside ARF unless an external CRM need is reintroduced.
- Keep event registration flows inside ARF unless a concrete external integration need is reintroduced.
- Prefer small vertical slices that can be verified end to end.
- Do not commit secrets, production data, attendee private information, or `.env` files.

## Local Setup

Install dependencies for the ARF web app:

```sh
npm --prefix apps/arf-web install
```

Run the ARF web app:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run typecheck
```

## Documentation

Update the relevant `docs/` page when changing product behavior, integration contracts, deployment expectations, or security assumptions.
