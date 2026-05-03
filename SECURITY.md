# Security Policy

cego is intended to manage private community event information. Treat member profiles, RSVP state, survey answers, organizer notes, and private-location planning data as sensitive.

## Supported Versions

No production version has been released yet.

## Reporting Issues

Until a dedicated security contact is published, report security concerns privately to the repository owner.

Do not open public issues containing:

- Secrets or credentials.
- Member personal data.
- Event private location details.
- Vulnerability reproduction against a live deployment.

## Baseline Expectations

- Do not commit secrets or `.env` files.
- Keep admin surfaces behind Cloudflare Access and app-level roles.
- Verify Telegram Mini App init data before trusting identity.
- Do not store payment method data in cego.
- Keep cego source availability aligned with AGPLv3 obligations.
