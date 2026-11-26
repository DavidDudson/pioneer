# Hand-rolled code audit

Findings of [#1729 refactor: audit hand-rolled code a library already covers](https://github.com/DavidDudson/pioneer/issues/1729),
under [Epic 18.2](https://github.com/DavidDudson/pioneer/issues/1728). It compares what the repo wrote by hand with what
its stack (Angular, TanStack Query, TanStack Pacer, zod, drizzle, Bun, the Temporal polyfill) already provides, and with
the two collection libraries the story names, `es-toolkit` and `remeda` (neither is a dependency today).

Counts are from a ripgrep sweep of `libs/`, `apps/` and `tools/`, specs left out. Bundle cost is not measured: no
dependency was added to take a measurement, and the verdicts below do not turn on it.

## Table

| Hand-rolled code                                                     | Candidate library                         | Lines removed | Licence | Verdict                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------- |
| `clamp`, `sum`, capitalise, `isRecord` (4 helpers)                   | `es-toolkit`, `remeda`                    | 0 more        | MIT     | No. Moved to `shared/utils`, 1 to 8 lines each (ADR-0080)                 |
| `groupBy`, unique, chunk, `Array.from({ length })`                   | Native (`Map.groupBy`, `Set`)             | 0             | n/a     | No. 568 native uses, no copies                                            |
| Sort comparators (92 `localeCompare` over 76 files)                  | `es-toolkit` `orderBy`, `remeda` `sortBy` | Unclear, tens | MIT     | No library. Maybe a `compareBy` in `shared/utils`                         |
| Date and time                                                        | Temporal polyfill (in use)                | 0             | MIT     | Already covered; `Date` is banned by lint                                 |
| Retry and backoff                                                    | TanStack Query defaults                   | 0             | MIT     | Already covered; the one hand-written case is deliberate                  |
| Debounce                                                             | TanStack Pacer (in use)                   | 0             | MIT     | Already covered                                                           |
| Parsing and validation                                               | zod (in use)                              | 0             | MIT     | Already covered                                                           |
| Text diffing                                                         | none needed                               | 0             | n/a     | None found in the repo                                                    |
| One-edit name match (`withinOneEdit`, about 27 lines)                | `fastest-levenshtein`                     | About 25      | MIT     | No. Plain Levenshtein counts a swap as two edits, and there is one caller |
| Server-side pack caches (`HashKeyedCache`, `PackSetCache`, 79 lines) | `lru-cache`                               | About 40      | ISC     | No. Keyed on content hashes, which `lru-cache` does not know              |
| Inline edit status machine (`inline-edit.ts`, 304 lines)             | `xstate`                                  | Unclear       | MIT     | No. One machine, already built on TanStack Pacer and signals              |
| Client query cache                                                   | TanStack Query (in use)                   | 0             | MIT     | Already covered                                                           |
| Content search                                                       | Postgres `websearch_to_tsquery` (in use)  | 0             | n/a     | Already covered by SQL                                                    |

## Reading the table

- **Collection helpers.** What a collection library would replace is native (`Map.groupBy`, `Set`, `toSorted`,
  `Array.from`) or four helpers that are now in `shared/utils`, at 1 to 8 lines each. `es-toolkit` `capitalize` also
  lower-cases the rest of the word, so it would change behaviour at 13 call sites. Adding a dependency to delete code
  that is already deleted adds weight and removes nothing.
- **Sorting is the one open shape.** 92 `localeCompare` calls and 231 sorts repeat "compare by this key, then that one".
  A `compareBy` helper is a few lines in `shared/utils`, and either collection library would do it, but each call
  site's tie-breaks differ and most are table columns with a direction. Not worth a story until a third copy of the
  direction handling appears.
- **Most hand-rolled things are already library-backed.** The audit's list is largely covered by the stack: dates by
  Temporal, debounce by Pacer, retry and query caching by TanStack Query, parsing by zod, search by Postgres.
- **The three bespoke pieces stay.** `withinOneEdit`, the hash-keyed caches and the inline-edit machine each encode a
  rule of the product, and each library alternative needs wrapping that costs about what it saves.

## Decision

No story to add `es-toolkit` or `remeda`, and no follow-up stories from this audit.
[#1730 refactor: adopt a collection utility library where it deletes code](https://github.com/DavidDudson/pioneer/issues/1730)
is "otherwise close as not needed" under its own text, and this table is the reason. Revisit when `shared/utils` holds
more than about ten helpers or a second `compareBy`-shaped copy appears.
