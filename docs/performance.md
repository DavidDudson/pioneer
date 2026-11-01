# Performance

Findings and budgets for page load and request cost. Measurements are from a local API and Postgres on a loaded dev
machine (load average about 8), so read the counts and ratios, not the milliseconds. Re-run the method below after a
change and record the new numbers here.

## Character sheet load (audit, 2026-11-01)

Method: start the dev API (`bun apps/api/src/main.dev.ts`), sign in through the dev bypass, create a level 1 character,
set `log_statement = 'all'` on the dev database, `curl` each endpoint the sheet calls and count the statements in
`.data/postgres.log`. The character is small, so response sizes are a floor.

### Requests

Opening a sheet makes 11 calls to the API, each its own HTTP request, auth and character load:

| Endpoint (`/api/characters/:id` +) | Body  | SQL statements | Notes                                                   |
| ---------------------------------- | ----- | -------------- | ------------------------------------------------------- |
| (none)                             | 4.8 K | 17             | 85-93 ms; campaigns looked up twice, packs read 3 times |
| `/play`                            | 389 B | 4              |                                                         |
| `/sheet-mode`                      | 2 B   | 4              | loads the whole character document to check access      |
| `/feat-display`                    | 20 B  | 4              |                                                         |
| `/allies`                          | 13 B  | 5              |                                                         |
| `/packs`                           | 8.0 K | 11             | the same `content_packs` select (with `data`) 5 times   |
| `/rule-limits`                     | 72 B  | 11             | campaigns twice, packs and variant rules read again     |
| `/rule-limit-settings`             | 415 B | 11             |                                                         |
| `/item-approvals`                  | 16 B  | 4              |                                                         |
| `/variant-rules`                   | 693 B | 9              |                                                         |
| `/unenabled-content`               | 41 B  | 4              |                                                         |
| Total                              | 14 K  | about 84       |                                                         |

Every request repeats: session lookup, character row with its full `document`, and the campaign lookup. Seven of the
eleven answers are under 100 bytes, so the per-request overhead is the cost, not the payload.

### Content registry

- `GET /api/content/manifest` is 585 KB uncompressed (51 packs, 522 kind entries) with `Cache-Control: public,
max-age=10` and no `ETag`, so a warm session re-downloads it every ten seconds of use.
- The character kinds (`CHARACTER_CONTENT_KINDS`) cover 104 kind entries: up to 208 bundle files (mechanics and names)
  on a cold load, plus description shards on demand. Bundles are `immutable` for a year and also kept in IndexedDB, so
  warm loads fetch none of them.
- No compression (gzip, brotli, zstd) is configured in the API, edge app, `Dockerfile` or `infra/`; if the CDN does not
  add it, the manifest and bundles go out raw.

### Findings, by story

- [#1716](https://github.com/DavidDudson/pioneer/issues/1716): one `GET /characters/:id/sheet` for the always-needed
  parts (play, sheet mode, feat display, packs, variant rules, rule limits and settings, unenabled content), with
  allies and item approvals fetched when their tab opens. Turns 11 requests and about 84 statements into 1 request and
  a handful.
- [#1717](https://github.com/DavidDudson/pioneer/issues/1717): sub-resource routes only need an ownership check, not
  the character document; memoise `readableBy`/`official`/`byIds` per request in the pack catalog; look up the attached
  campaign once per request.
- [#1718](https://github.com/DavidDudson/pioneer/issues/1718): enable compression, and measure `z.encode` and
  `parse` on the character and manifest bodies.
- [#1721](https://github.com/DavidDudson/pioneer/issues/1721): give the manifest an `ETag` and a longer
  `stale-while-revalidate`, since it changes only on a content seed.

`GET /characters/:id/sheet` is the API half of [#1716](https://github.com/DavidDudson/pioneer/issues/1716): the sheet,
rule limits and, for the owner, play state, sheet mode, feat display, packs, variant rules, rule limit settings and
unenabled content. Only the owner may read all but the sheet and its rule limits, so a campaign's GM gets those two.
Measured with the probe's `/sheet` row (level 1 character, 20 runs): 1 request, 14,635 B, 59 statements and a 15 ms
median, against 11 requests, 14,545 B and 84 statements for the separate calls. The web stores make the separate calls
until they are seeded from it.

### Side finding: session touch on a non-UTC database

On a database whose time zone is not UTC (the dev machine is UTC+10) every authenticated request writes the session
row and `expires_at` moves back ten hours each time, so the hourly `LAST_SEEN_RESOLUTION` throttle never holds. A
production database in UTC is not affected. Setting the connection time zone to UTC in `connect` would remove the
dependence. Tracked in [#1717](https://github.com/DavidDudson/pioneer/issues/1717).
