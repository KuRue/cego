# Telegram Bot Setup

ARF uses one Telegram bot for Mini App launch links, browser Telegram SSO, group membership checks, and later notifications.

## BotFather Setup

1. Create the bot with `/newbot`.
2. Save the bot token as `TELEGRAM_BOT_TOKEN`.
3. Save the bot username without `@` as `TELEGRAM_BOT_USERNAME`.
4. Configure the Mini App with `/newapp` and set the web app URL to `https://arf.kurue.com/mini-app`.
5. Configure browser login with `/setdomain` and set the domain to `arf.kurue.com`.
6. Add the bot to the ARF Telegram group.
7. Promote the bot to an administrator if group membership checks fail for normal users.

## ARF Environment

Required Telegram variables:

```sh
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
TELEGRAM_BOT_USERNAME=arf_bot
TELEGRAM_GROUP_ID=replace-with-telegram-group-id
TELEGRAM_WEBAPP_URL=https://arf.kurue.com/mini-app
ARF_ADMIN_TELEGRAM_IDS=123456789
```

`ARF_ADMIN_TELEGRAM_IDS` is a comma or whitespace separated list of Telegram IDs that should become ARF admins when their member profile is created or updated.

## Sign-In Paths

- Browser users open `/sign-in`, use Telegram Login Widget, and return through `/api/telegram/login`.
- Telegram app users open `/mini-app`, which sends `Telegram.WebApp.initData` to `/api/telegram/session`.
- Both paths create or update the same member profile and issue the same `arf_session` cookie.

## Sanity Checks

- `/sign-in` renders the Login Widget when `TELEGRAM_BOT_USERNAME` is set.
- A valid Telegram Login Widget callback redirects to `/dashboard`.
- `/mini-app` still creates a session from Telegram Mini App init data.
- Non-group users can authenticate but remain blocked from RSVP flows.
- Admin Telegram IDs listed in `ARF_ADMIN_TELEGRAM_IDS` show organizer access after sign-in.
