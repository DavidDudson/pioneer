# Performance probe

`tools/perf-probe.ts` measures what opening a character sheet costs the API, so a performance change can show a
before and an after. Benchmarks (`docs/benchmarks.md`) cover CPU-bound code; this covers requests, SQL and bytes.

## Run it

```sh
just db-up
bun apps/api/src/main.dev.ts   # in another shell, or `just dev`
bun run perf:probe             # --api, --character <id>, --runs 20, --out tmp/perf-probe.json, --pg-log .data/postgres.log
```

It signs in as the dev player, creates a throwaway level 1 character (pass `--character <id>` for a big build), calls
the 11 endpoints a sheet loads, and the `/sheet` bundle that answers for them in one request, 20 times each, one at a
time, and then the 11 all at once. It turns `log_statement` on for the
run and counts statements in the Postgres log, so nothing else may use the database meanwhile. Output is a table, and
JSON in `tmp/perf-probe.json`.

Counts, sizes and compression are exact and repeatable. Milliseconds depend on the machine and its load: compare runs
from one machine, one after another.

## Baseline

`main` at `92648a445`, level 1 character, dev machine under load (load average about 8), 20 runs.

| Endpoint (`/api/characters/:id` +) | Body (B) | Median (ms) | p95 (ms) | SQL statements |
| ---------------------------------- | -------: | ----------: | -------: | -------------: |
| (none)                             |     4852 |          93 |      159 |             17 |
| `/play`                            |      389 |         2.6 |       12 |              4 |
| `/sheet-mode`                      |        2 |         2.8 |        5 |              4 |
| `/feat-display`                    |       20 |         3.4 |        5 |              4 |
| `/allies`                          |       13 |         3.2 |        6 |              5 |
| `/packs`                           |     8032 |         4.1 |      6.7 |             11 |
| `/rule-limits`                     |       72 |         4.2 |        8 |             11 |
| `/rule-limit-settings`             |      415 |         3.6 |       13 |             11 |
| `/item-approvals`                  |       16 |         3.7 |        5 |              4 |
| `/variant-rules`                   |      693 |         4.0 |       14 |              9 |
| `/unenabled-content`               |       41 |         2.6 |      4.9 |              4 |

**Whole sheet load** (all 11 at once): 11 requests, 14,545 B, 118 ms wall, 84 statements.

**Content manifest**: 585,294 B, no `content-encoding`, `Cache-Control: public, max-age=10`, no `ETag`.

`GET /characters/:id` takes 93 ms for 17 statements while every other endpoint takes 3 to 4 ms, so one of its steps
costs about 90 ms. That is the first thing to look at for the DB story.

Record each performance change's probe result in its PR next to this baseline.
