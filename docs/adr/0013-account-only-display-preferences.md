# 0013. Display preferences belong to accounts; signed out is defaults

- Status: Accepted
- Date: 2026-10-09

## Context

ADR-0009 resolved the UI locale from the account preference, then the browser's `Accept-Language`, then `en`, and
story #95 first planned to let signed-out visitors choose locales and units in browser storage, merged into the
account on sign-in. That gives two places a choice can live, a merge rule between them, and a page whose language
depends on the device as much as on the person.

## Decision

- **Only signed-in users have display preferences.** UI locale, content locale and distance unit are stored per
  account (`user_preferences`, one audited row per user, a field `NULL` until chosen) and changed at
  `/account/settings`, which needs sign-in.
- **Everyone else gets the defaults:** the source locale (`en`) for UI and content, and feet as written.
  `Accept-Language` is not consulted, and an unchosen account field shows the same default. This supersedes the
  locale resolution in ADR-0009.
- **The browser only caches the account.** The last signed-in user's choices are kept in `localStorage` so their
  locale applies before bootstrap instead of after `/api/me` answers. The cache is cleared whenever nobody is
  signed in, and nothing a signed-out visitor does writes it.
- **A choice is changed, not removed.** `PATCH /api/me/preferences` sets the fields it gives; there is no way back
  to "not chosen", because the settings page always shows a value.

## Consequences

- One source of truth per person; nothing to merge on sign-in.
- A visitor whose browser prefers another language sees English until they sign in and choose. Revisit when
  translations ship: a signed-out language switch would then need its own decision.
- `LocalePreferences` (shared/web) holds no policy of its own: identity's `AccountPreferences` adopts the
  account's choices or resets to the defaults.
