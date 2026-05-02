# ARF Telegram Package

Utilities for Telegram Mini App identity verification, Telegram Login Widget verification, and Telegram Bot API calls.

This package follows Telegram's Mini App server-side validation model:

- Use `Telegram.WebApp.initData`, not `initDataUnsafe`.
- Build a sorted data check string without `hash`.
- Compare against HMAC-SHA256 using the bot token-derived secret.
- Reject stale `auth_date` values.

The Bot API group membership check uses `getChatMember`, which Telegram only guarantees for other users when the bot is an administrator in the chat.

Browser sign-in follows Telegram Login Widget validation:

- Build a sorted data check string without `hash`.
- Use `SHA256(bot_token)` as the HMAC key.
- Compare against the received HMAC-SHA256 hash.
- Reject stale `auth_date` values.
