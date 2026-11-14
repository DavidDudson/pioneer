---
name: reimport
description: Bring the rules a translator now covers into the committed Foundry packs without replacing them. Use when the user says "reimport", "re-import <pack>", "run content-import again", or after a translator change that needs a pack's backlog answered.
argument-hint: '<pack> [book] <RuleKey>[,<RuleKey>...]'
---

# Re-import a pack: apply rules only

`just content-import` never replaces a committed pack (ADR-0031: the committed JSON is the source of truth, and
later hand corrections to it stand). A run that writes needs `--apply-rules <Key>[,<Key>...]`; `--dry-run` alone only
reports. For each entry whose backlog lists a `rule` gap of one of the keys, the import appends the rules of those
keys it now translates (after the entry's own, never repeating one it holds) and clears the gaps they answer. Nothing
else in the entry changes, so descriptions, hand-fixed rules, `dismiss` flags and prerequisite predicates are safe.

## Steps

1. Clean tree on the branch (`overbridge status`). Run everything in the devshell (`overbridge shell pioneer -- <cmd>`).
2. Name the keys the translator change covers: the element it translates, and the elements that read what it
   translates (a `ChoiceSet` and the `Resistance`, `FlatModifier` rules that read its pick).
3. Dry run: `just content-import --pack <pack> --book <book> --dry-run`. Read the counts.
4. Apply, pack by pack: `just content-import --pack <pack> --book <book> --apply-rules <Keys>`. It rewrites only the
   entry files that gained rules and `content/import/<pack>.json`.
5. Review `git diff --stat` and spot-check entries: only appended rules and cleared backlog gaps should differ.
6. Check: `bunx nx run rules-catalog:test`; DB tests need `just db-up`. Commit `feat(content): ...` stating the keys
   and what they brought in.

## Vocabulary descriptions

`just content-import --pack <pack> --book <book> --apply-descriptions trait` fills the empty `description` of the
committed vocabulary entries of that kind (`imported/<pack>/trait.json`) from the pinned release, and replaces the
pack's `missing-description` backlog items with the ones the import still has. Filled descriptions are never
overwritten. Run it per pack after the importer learns to read a kind's descriptions; a second run changes nothing.
A pack whose book selects no entries cannot be reached. `ancestry-guide` is the one: its book is pre-remaster and has no
`legacy` flag in `books.json`, so selection skips every entry as `legacy`. Its three traits (`android`, `geniekin`,
`resonant`) were filled by hand from the pin's `PF2E.TraitDescription<Bactrian>` lang keys. Every other
`imported/<pack>` has a book that selects entries. Review that `git diff` shows
descriptions and `missing-description` items only.

## Check outcomes

`just content-import --pack <pack> --book <book> --apply-outcomes` takes the per-degree outcomes the import builds for a
non-basic check and adds them to the same check in the committed description, in the file's own text. It names the
descriptions it skips because they were fixed by hand. Run it per pack after a change to `check-outcomes.ts`; a second
run changes nothing. Review that `git diff` shows added `outcomes` only (reflowed lines of a touched check aside).

A pack or entry the import has not committed yet is a story of its own: the importer cannot create it here.
