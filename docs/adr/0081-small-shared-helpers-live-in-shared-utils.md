# 0081. Small shared helpers live in `shared/utils`

- Status: Proposed
- Date: 2026-11-26

## Context

The [duplicated helpers inventory](../architecture/duplicated-helpers.md) found the same small functions written again
in several libs: `clamp` (14 sites), capitalising a word (13), `isRecord` (5) and summing numbers (16). Each copy is
tiny, so none was worth a library on its own, and a lib that wanted one could not take it from a sibling: `character/*`
cannot import `frontier`, `interop/foundry` cannot import `rules/ui`.

The only place every lib may import is `shared/kernel`, which holds Pioneer's domain primitives (ids, brands, units,
the endpoint and error types, the clock). Alternatives:

- **Add them to `shared/kernel`.** No new lib, but the kernel stops being a list of domain primitives and becomes a grab
  bag, and every helper change reruns every project that depends on the kernel's tests.
- **A `shared/utils` lib** (chosen). One import path, a boundary of its own, helpers with no domain meaning.
- **A third-party collection library for all of it.** Rejected for these four: each is one to three lines, and the
  audit in [#1729](https://github.com/DavidDudson/pioneer/issues/1729) decides separately whether a library earns its
  place for the collection helpers.

## Decision

1. **`libs/shared/utils` (`@pioneer/shared/utils`) holds helpers that know no Pioneer domain concept**: plain numbers,
   strings, objects and iterables in, the same out. A helper that names a rules or character concept, or returns a
   brand, belongs to its domain lib.
2. **Tags `scope:shared`, `type:domain`, `platform:any`.** The existing `depConstraints` then let every domain, UI,
   data-access and application lib import it, frontier included (`type:ui` may use `type:domain`), and it may import
   only other `scope:shared`, `platform:any` libs. No new lint rule is needed; the rules that already apply are the
   boundary.
3. **Bare `number` and `string` are fine here.** `pioneer/no-primitive-domain-types` covers domain and rules code; this
   lib is the layer below the brands. A caller that has a brand parses the result: `AirRounds.parse(clamp(...))`.
4. **One helper per file, one test file per helper**, exported from `src/index.ts`. A helper joins when a second lib
   needs it, not before.
5. **Collection helpers stay native** (`Map.groupBy`, `Set`, `Array.from`) until the library audit says otherwise.

## Consequences

- The first four helpers move in with this ADR and their copies are deleted. `tools/` scripts and specs may import the
  lib too (they sit outside the boundary rules).
- Reviewers can point at `shared/utils` instead of accepting another copy.
- A helper that grows a domain meaning moves out again. The lib stays small on purpose.
