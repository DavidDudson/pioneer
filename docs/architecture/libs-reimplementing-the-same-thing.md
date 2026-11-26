# Libs reimplementing the same thing

Findings of [#1727 refactor: libs reimplementing the same thing](https://github.com/DavidDudson/pioneer/issues/1727),
under [Epic 18.1](https://github.com/DavidDudson/pioneer/issues/1724). It looks for functionality that two libs each
grew, as opposed to the small helpers of the [duplicated helpers inventory](duplicated-helpers.md).

The sweep was by reading and searching the four examples the story names, not a clone detector. A candidate is listed
as a duplicate only where two libs do the same job; similar shape alone is not enough.

## Findings

| Candidate                               | Verdict                    | Owner                               | Follow-up                                                   |
| --------------------------------------- | -------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Name folded for matching, three ways    | Duplicate                  | One function, `shared/utils`        | [#2215](https://github.com/DavidDudson/pioneer/issues/2215) |
| Foundry name-to-slug shortcuts          | Duplicate (inside one lib) | `interop/foundry/foundry-slug.ts`   | [#2216](https://github.com/DavidDudson/pioneer/issues/2216) |
| Drizzle archive, restore, version check | Repeated pattern           | `shared/server`                     | [#2217](https://github.com/DavidDudson/pioneer/issues/2217) |
| Per-feature query stores                | Repeated shape             | `shared/web`, where it deletes code | [#2218](https://github.com/DavidDudson/pioneer/issues/2218) |
| Foundry and Pathbuilder translators     | Not duplicates             | Both stay                           | none                                                        |
| Route boilerplate in `apps/api`         | Not examined in depth      | n/a                                 | none                                                        |

### Name folding

`normalise` in `rules/catalog/src/aon-matcher.ts` (NFD, strip marks, curly to straight apostrophe, collapse spaces,
lower case), the lookup key in `interop/pathbuilder/src/content-lookup.ts` (NFKD, strip diacritics, drop apostrophes,
lower case, non-alphanumerics to spaces) and `folded` in `interop/foundry/src/foundry-slug.ts` (NFKD, strip marks) all
answer "do these two names mean the same item". They disagree on apostrophes (kept, dropped, untouched) and punctuation,
so one name can match in one importer and miss in another. The story picks one key and pins each behaviour in a test
before any caller changes.

### Foundry slug shortcuts

`slugOf` in `foundry-flags.ts`, `slugOf` in `translate-battle-form.ts` and `asciiNameSlug` in `foundry-slug.ts` differ
on accents and repeated hyphens. `foundry-slug.ts` is the owner because it copies Foundry's own algorithm; the story
keeps that and makes the others call it, unless a caller has a stated reason to differ.

### Drizzle repositories

The character, campaign and homebrew pack repositories each write the archive, restore and version-conflict statements
([ADR-0062](../adr/0062-user-content-is-archived-never-deleted.md)). The identity repositories select by id the same
way too, but that is one line per call and not worth a helper. Only the statements that carry a rule (archive, restore,
versioned update) move to `shared/server`.

### Per-feature stores

The 14 `data/*-store.ts` files in the campaign, character and homebrew features hold 1,568 lines and share one shape: an
`ApiClient`, a `QueryClient`, a keyed `injectQuery` and a mutation that invalidates the key. They are not copies: the
campaign and character rule-limit stores differ on most lines once names are aligned. The story extracts only what
deletes lines and leaves a store alone where a helper would add indirection.

### Not duplicates

- **Foundry and Pathbuilder translators.** Foundry translates content packs into Pioneer entries; Pathbuilder reads a
  player's character export into a character. They share no translation logic, only the name matching above, and a
  merged translator would couple two formats that change for unrelated reasons.
- **Route boilerplate.** Route files live in `apps/api`, not in a lib, and this pass did not read them closely enough to
  call a pattern. A later story can look again once the repository helpers exist.
