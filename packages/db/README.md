# ARF Database Package

This package contains the ARF-owned Postgres schema, migrations, and typed database helpers.

Planned entities:

- `members`
- `events`
- `rsvps`
- `surveys`
- `survey_responses`
- `notifications`
- `member_tags`
- `member_tag_assignments`
- `member_notes`

The implementation follows `docs/04-data-model.md`.

## Scripts

```sh
npm --prefix packages/db run typecheck
npm --prefix packages/db run db:generate
npm --prefix packages/db run db:migrate
```

`db:migrate` requires `DATABASE_URL`.
