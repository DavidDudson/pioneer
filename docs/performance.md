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

- `GET /api/content/manifest` is 585 KB raw (51 packs, 522 kind entries). It has an `ETag` and `Cache-Control: public,
max-age=10, stale-while-revalidate=60`, so an unchanged manifest costs a 304.
- The character kinds (`CHARACTER_CONTENT_KINDS`) cover 104 kind entries: up to 208 bundle files (mechanics and names)
  on a cold load, plus description shards on demand. Bundles are `immutable` for a year and also kept in IndexedDB, so
  warm loads fetch none of them.
- The API gzips JSON bodies of 1 KiB or more for clients that accept it (`apps/api/src/compression.ts`). Nothing else
  in the edge app, `Dockerfile` or `infra/` compresses. The CDN in front is likely to add its own, but its behaviour
  could not be checked before production has a hostname.

### Findings, by story

- [#1716](https://github.com/DavidDudson/pioneer/issues/1716): one `GET /characters/:id/sheet` for the always-needed
  parts (play, sheet mode, feat display, packs, variant rules, rule limits and settings, unenabled content), with
  allies and item approvals fetched when their tab opens. Turns 11 requests and about 84 statements into 1 request and
  a handful.
- [#1717](https://github.com/DavidDudson/pioneer/issues/1717): sub-resource routes only need an ownership check, not
  the character document; memoise `readableBy`/`official`/`byIds` per request in the pack catalog; look up the attached
  campaign once per request.
- [#1718](https://github.com/DavidDudson/pioneer/issues/1718): done; see "Response size and zod cost" below.
- [#1721](https://github.com/DavidDudson/pioneer/issues/1721): done by the manifest `ETag` and `stale-while-revalidate`;
  see "Response size and zod cost" for why the window stays short.

`GET /characters/:id/sheet` is the API half of [#1716](https://github.com/DavidDudson/pioneer/issues/1716): the sheet,
rule limits and, for the owner, play state, sheet mode, feat display, packs, variant rules, rule limit settings and
unenabled content. Only the owner may read all but the sheet and its rule limits, so a campaign's GM gets those two.
Measured with the probe's `/sheet` row (level 1 character, 20 runs): 1 request, 14,635 B, 59 statements and a 15 ms
median, against 11 requests, 14,545 B and 84 statements for the separate calls. The web stores make the separate calls
until they are seeded from it.

The bundle reads each thing once. `characterSheetBundleRoutes` opens a request scope (`inRequestScope`,
`libs/shared/server/src/request-memo.ts`), and the adapters that were read several times per request answer once inside
it through a `RequestMemo`: the character row, the attached campaign, the pack directory, a character's pack, variant
and rule limit rows, the official pack hashes and the packs that define a character's entries. Outside a scope a
`RequestMemo` reads every time, so writes and every route that opens no scope behave as before; open a scope only
around a read that writes nothing. Measured the same way: `/sheet` went from 58 to 13 statements, with the same
14,635 B body and a 9 to 11 ms median either side. The separate calls are unchanged at 83 statements for the eleven.

`ContractRouter` opens the same scope around every GET handler, and no other method's, since a write handler that read,
wrote and read again would be served its first answer. That takes the separate calls from 83 to 67 statements for the
eleven: `GET /characters/:id` from 17 to 9, `/packs` from 10 to 7, `/rule-limits` and `/rule-limit-settings` from 11 to
9, `/variant-rules` from 9 to 8. `/sheet-mode` stays at 4: it still loads the whole character document to check
access, which a lighter ownership check would remove.

### Side finding: session touch on a non-UTC database

On a database whose time zone is not UTC (the dev machine is UTC+10) every authenticated request writes the session
row and `expires_at` moves back ten hours each time, so the hourly `LAST_SEEN_RESOLUTION` throttle never holds. A
production database in UTC is not affected. Setting the connection time zone to UTC in `connect` would remove the
dependence. Tracked in [#1717](https://github.com/DavidDudson/pioneer/issues/1717).

### Response size and zod cost

Sizes are the probe's, level 1 character. gzip and brotli are what `node:zlib` makes of the raw body (brotli at its
default quality), not what the API sends: the API sends gzip.

| Body                    | Raw       | gzip      | brotli   |
| ----------------------- | --------- | --------- | -------- |
| `/content/manifest`     | 585,296 B | 116,182 B | 78,096 B |
| `/characters/:id/sheet` | 14,635 B  | 3,459 B   | 2,996 B  |
| `/characters/:id`       | 4,852 B   | 968 B     | 813 B    |
| `/characters/:id/packs` | 8,032 B   | 2,005 B   | 1,782 B  |

Median time of 50 runs in one process, on this machine:

| Body                    | `z.decode` | `z.encode` | `JSON.stringify` | gzip    |
| ----------------------- | ---------- | ---------- | ---------------- | ------- |
| `/content/manifest`     | 2.94 ms    | 3.23 ms    | 0.26 ms          | 3.55 ms |
| `/characters/:id`       | 0.09 ms    | 0.10 ms    | under 0.01 ms    | 0.02 ms |
| `/characters/:id/sheet` | 0.13 ms    | 0.13 ms    | 0.01 ms          | 0.05 ms |

`ContractRouter` runs `z.encode` on every response. It costs about 3 ms on the 585 KB manifest and 0.1 ms on a
character, against 3 to 25 ms of request time, so caching the encoded body is not worth the code.

Gzip adds about 3.5 ms to an uncached manifest response and cuts it 80%. The manifest is public and revalidated by
`ETag`, so the edge answers most requests without reaching the API.

The manifest keeps `max-age=10`. A 304 is already cheap, and the short window is what lets a re-seed reach browsers in
seconds, so lengthening it trades that for few saved requests. That is a product call; nothing here argues for it.
