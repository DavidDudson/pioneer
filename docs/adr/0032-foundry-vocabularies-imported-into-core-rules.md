# 0032. Foundry vocabularies are imported into core-rules

- Status: Proposed
- Date: 2026-10-11
- Amends: [0031](0031-official-packs-imported-once-from-foundry.md) (an import also adds to `core-rules`)

## Context

Traits, languages, senses and damage types are not pack documents in Foundry pf2e: they are tables in its config
modules, with no publication, and serve every book: the same traits, languages and senses recur across Player Core,
GM Core and Monster Core. `core-rules` already holds the hand-authored rules core entries (statistics, languages,
senses, variant rules). Alternative: import them into each target pack, which repeats them per book and, before
[ADR-0033](0033-entry-slugs-name-their-kind.md), clashed with that pack's entries (the `dwarf` trait and ancestry).

## Decision

- Vocabulary entries go into `core-rules`, beside its hand-authored rules core entries. It is the one pack every
  import adds to: append only, in files of their own, never into or over a hand-authored file.
- Only what the selected documents use is imported. Damage types are the exception: Pioneer's `DamageType` is a
  closed set, so every Foundry damage type in it is imported, cited to the first target book.
- An entry `core-rules` already has of the kind and name is left to that entry, so a re-run or a later book's import
  never duplicates one. Slugs name their kind (`trait:goblin`, `language:goblin`), so kinds never clash
  (ADR-0033).
- Each added entry's provenance is the importing pack's pin; its gaps go in the importing pack's backlog.
- The CLI runs Foundry's config modules with Bun from the checksum-verified archive, standing in for remeda and
  `SYSTEM_ID`, rather than parsing TypeScript.

## Consequences

- `core-rules` mixes hand-authored and imported files; pack output (#400) keeps them apart.
- Later imports at newer pins add entries citing their own pins; existing entries are not updated by them.
