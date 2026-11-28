# Duplicated helpers inventory

Findings of the M18 spike [#1725 refactor: inventory duplicated helpers across libs](https://github.com/DavidDudson/pioneer/issues/1725).
It feeds [#1726 refactor: create a shared utils lib and move the duplicates in](https://github.com/DavidDudson/pioneer/issues/1726)
and the stories of [Epic 18.1](https://github.com/DavidDudson/pioneer/issues/1724).

## Method

A ripgrep sweep of `libs/`, `apps/` and `tools/` (specs, `content/` and generated code left out) for each helper name
and for each helper's body shape, since the same function often has a different name per file. Counts are call or
definition sites. `knip` and a clone detector (`jscpd`) are not run here: `knip` finds unused code, not copies, and
`jscpd` is not a dependency. A later story may add `jscpd` to CI once the first pass has cleaned the obvious copies.

## Helpers defined or inlined more than once

| Helper                        | Sites | Where                                                                                           | Verdict                                                               |
| ----------------------------- | ----- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `clamp` (`Math.min(Math.max`) | 14    | `character/domain` (6 files), `frontier` (5, one a local `clamp`), `rules/dice` (1)             | Move. One `clamp(value, min, max)` plus a unit-carrying form          |
| capitalise first letter       | 13    | `interop/foundry` (7 files), `rules/ui` (2), `character/feature`, `rules/sdk` testing (3 sites) | Move. One `capitalise`                                                |
| `isRecord` type guard         | 5     | `tools/content-import` (3), `character/domain`, `interop/foundry`                               | Move. One `isRecord` (see below for the `Json` variants)              |
| sum by `reduce`               | 16    | `tools/`, `character/domain`, `character/feature`, `rules/dice`, `rules/sdk`, `pathbuilder`     | Move. One `sum(values, pick?)`                                        |
| name to slug (`slugOf`)       | 4     | `interop/foundry`: `foundry-flags`, `translate-battle-form`, plus `asciiNameSlug`, `kebab`      | Consolidate inside `interop/foundry`, not the shared lib              |
| `partition`                   | 1     | `interop/foundry/translate-rules.ts`                                                            | Stay. Domain-specific (splits translated rules), shares only the name |
| `titleCase`                   | 1     | `interop/foundry/translate-skill-choices.ts`                                                    | Folds into `capitalise`                                               |
| `uniqueId(prefix)`            | 1     | `frontier/ids.ts`                                                                               | Stay. A DOM id helper, not shared with the domain                     |
| `sleep` (`new Promise` timer) | 3     | specs only (`setTimeout(resolve, 0)`)                                                           | Add `tick()` to `shared/kernel/testing`                               |

Notes on the verdicts:

- **`foundrySlug` is not a duplicate.** `foundry-slug.ts` `slugify` copies Foundry pf2e's algorithm on purpose, so
  Pioneer slugs match its source. `slugOf` in `foundry-flags.ts` and `translate-battle-form.ts`, and `asciiNameSlug`,
  are different shortcuts to the same intent and disagree on edge cases (apostrophes, accents, repeated hyphens). They
  belong to one owner inside `interop/foundry`, picked in the [#1727 refactor: libs reimplementing the same thing](https://github.com/DavidDudson/pioneer/issues/1727)
  story, not to a shared lib: nothing outside the Foundry translator needs them.
- **`groupBy`, `unique`, `chunk` and `Array.from({ length })` need no helper.** `Map.groupBy` is already used at 11 sites,
  `new Set(...)` at 481 and `Array.from({ length })` at 75, all native. The collection library question moves to
  [#1729 refactor: audit hand-rolled code a library already covers](https://github.com/DavidDudson/pioneer/issues/1729).
- **`isRecord` has two shapes.** Three copies narrow `unknown`; `apply-descriptions.ts` narrows the tool's own `Json`
  type. The shared one takes `unknown` and returns `Readonly<Record<string, unknown>>`; the `Json` caller keeps its own
  `JsonRecord` alias over it.
- **Brands stay with their domain.** The clamp sites that parse a brand (`AirRounds.parse(Math.min(Math.max(...)))`)
  keep the parse; only the bounds arithmetic moves.
- **No `debounce`, `throttle` or retry copies.** The picker debounces through `@tanstack/angular-pacer`, retries sit in
  TanStack Query's defaults, and `tools/aon-sources/polite-fetch.ts` has the only hand-written `Retry-After` handling
  (deliberate: it stops on a refusal instead of retrying).

## Where the helpers can live

`libs/shared/kernel` (`scope:shared`, `type:domain`, `platform:any`) is the existing home for brands, ids and units, and
it already carries `comma-list.ts` and `runic-pair.ts`, which are helpers of the kind listed above. Adding more there would
make it a grab bag; a separate `shared/utils` keeps the kernel to domain primitives. The boundary rules, the name and the
ADR are the subject of the next story.

## Proposed stories

| Story                             | Moves                                                      |
| --------------------------------- | ---------------------------------------------------------- |
| Shared utils lib (#1726)          | `clamp`, `capitalise`, `isRecord`, `sum`                   |
| Foundry slug helpers (from #1727) | The three name-to-slug shortcuts, inside `interop/foundry` |

## Out of scope

Whole features implemented twice (translators, stores, repositories, route boilerplate) are the next story's inventory.
