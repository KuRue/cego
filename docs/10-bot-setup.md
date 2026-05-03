# Telegram Bot Setup

cego uses one Telegram bot for Mini App launch links, browser Telegram SSO, group membership checks, and later notifications.

## BotFather Setup

1. Create the bot with `/newbot`.
2. Save the bot token as `TELEGRAM_BOT_TOKEN`.
3. Save the bot username without `@` as `TELEGRAM_BOT_USERNAME`.
4. Configure the Mini App with `/newapp` and set the web app URL to `https://cego.example.com/mini-app`.
5. Configure browser login with `/setdomain` and set the domain to `cego.example.com`.
6. Add the bot to the community Telegram group.
7. Promote the bot to an administrator if group membership checks fail for normal users.

## cego Environment

Required Telegram variables:

```sh
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
TELEGRAM_BOT_USERNAME=cego_bot
TELEGRAM_GROUP_ID=replace-with-telegram-group-id
TELEGRAM_WEBAPP_URL=https://cego.example.com/mini-app
CEGO_ADMIN_TELEGRAM_IDS=123456789
```

`CEGO_ADMIN_TELEGRAM_IDS` is a comma or whitespace separated list of Telegram IDs that should become cego admins when their member profile is created or updated.

cego also promotes Telegram group administrators to cego admins during sign-in by calling `getChatAdministrators` for `TELEGRAM_GROUP_ID`. Keep `CEGO_ADMIN_TELEGRAM_IDS` as the bootstrap override in case Telegram admin lookup is unavailable.

## Sign-In Paths

- Browser users open `/sign-in`, use Telegram Login Widget, and return through `/api/telegram/login`.
- Telegram app users open `/mini-app`, which sends `Telegram.WebApp.initData` to `/api/telegram/session`.
- Both paths create or update the same member profile and issue the same `cego_session` cookie.

## Sanity Checks

- `/sign-in` renders the Login Widget when `TELEGRAM_BOT_USERNAME` is set.
- A valid Telegram Login Widget callback redirects to `/dashboard`.
- `/mini-app` still creates a session from Telegram Mini App init data.
- Non-group users can authenticate but remain blocked from RSVP flows.
- Admin Telegram IDs listed in `CEGO_ADMIN_TELEGRAM_IDS` show organizer access after sign-in.
