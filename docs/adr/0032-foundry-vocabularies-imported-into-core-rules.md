# 0032. Foundry vocabularies are imported into core-rules

- Status: Proposed
- Date: 2026-10-11
- Amends: [0031](0031-official-packs-imported-once-from-foundry.md) (an import also adds to `core-rules`)

## Context

Traits, languages, senses and damage types are not pack documents in Foundry pf2e: they are tables in its config
modules, with no publication. Entry ids are UUIDv5 of `<pack>/<slug>` across kinds, and a trait entry's slug is the
trait, so in the target pack the `dwarf` trait clashes with the Dwarf ancestry, `fighter` with the class, `grapple`
with the action. Alternatives: suffix the documents (`dwarf-ancestry`), which breaks carrying over hand-authored
slugs (#401); suffix the traits, which breaks "a trait entry's slug is the trait".

## Decision

- Vocabulary entries go into `core-rules`, beside its hand-authored rules core entries. It is the one pack every
  import adds to: append only, in files of their own, never into or over a hand-authored file.
- Only what the selected documents use is imported. Damage types are the exception: Pioneer's `DamageType` is a
  closed set, so every Foundry damage type in it is imported, cited to the first target book.
- A slug `core-rules` already has for the kind, as is or with the kind suffix an earlier run gave it, is left to that
  entry, so a re-run or a later book's import never duplicates one. Traits claim slugs first; other kinds take their
  kind as a suffix on a clash; a slug still taken is reported.
- Each added entry's provenance is the importing pack's pin; its gaps go in the importing pack's backlog.
- The CLI runs Foundry's config modules with Bun from the checksum-verified archive, standing in for remeda and
  `SYSTEM_ID`, rather than parsing TypeScript.

## Consequences

- `core-rules` mixes hand-authored and imported files; pack output (#400) keeps them apart.
- Later imports at newer pins add entries citing their own pins; existing entries are not updated by them.
