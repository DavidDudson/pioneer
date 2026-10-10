# 0031. Official packs are imported once from Foundry, then owned in the repo

- Status: Proposed
- Date: 2026-10-11

## Context

ADR-0003 has `tools/content-import` generate the official packs from a pinned foundryvtt/pf2e release, and has
errata arrive by re-import. ADR-0021 and ADR-0022 build on that: a schema change is "a migration of nothing, since
entries are re-imported", and an exported actor's generation includes the imported content's Foundry release.

A repeatable import means every fix to an official entry has to live in the importer or in Foundry, because the next
run overwrites the JSON. Most of the work after the import is not translation but enrichment and correction by
hand: page numbers and AoN links (ADR-0005, Epic 2.7), prerequisites the parser missed, spell fields Foundry writes
as free text (ADR-0021), facet fields the importer cannot fill (ADR-0025). Keeping those as overlays the importer
re-applies would make every correction a mapping-file entry keyed by slug, kept in step with Foundry's changes.

Alternatives: re-import on every Foundry release with overlay files for hand corrections (the cost above); re-import
and merge into the committed JSON field by field (a three-way merge per entry, and a re-import still undoes hand
fixes to any field Foundry also changed).

## Decision

- The Foundry import is a one-off bootstrap per pack. The importer runs against a pinned release, writes a pack to
  `content/packs/<pack>/`, and that PR is the last time the pack is generated. From then on the committed JSON is
  the source of truth: enriched, corrected and given errata by hand, reviewed as ordinary diffs.
- The importer only ever writes a pack that does not exist yet or replaces one as a whole, and is re-run only while
  it is being built and before its pack is merged. It never merges into a pack that has been edited by hand.
- The pin (release tag and archive checksum) and the import's leftovers live under `content/import/`, committed with
  the pack: `content/import/<pack>.json` holds what the import could not translate, per entry, with Foundry's raw
  JSON (rule elements, fields, labels, links). It is the backlog for Epic 2.6 (#21) and later translator work.
- A translator that lands after its pack is imported is applied to the backlog, not by re-importing: a command
  translates the backlog items it now covers, adds them to the committed entries and removes them from the backlog.
  Hand edits to those entries are kept.
- The coverage report runs over the committed packs and their backlog, in CI on PRs touching `content/`. It
  reports; it never fails the build.
- Supersedes ADR-0003's errata-by-re-import and generated-packs decisions; content as data, remaster-only selection
  and the id scheme stand.

## Consequences

- Fixes to official content are one PR against the JSON, no importer change and no overlay file.
- Foundry errata after the import does not arrive on its own. It is applied by hand, guided by a diff of Foundry's
  releases for the imported entries; nothing tracks it automatically.
- A schema change to a kind migrates the committed JSON with a script in the same PR, amending ADR-0021's "migration
  of nothing".
- An exported actor's generation (ADR-0022) combines the exporter's version with the official packs' content hash
  (ADR-0029) instead of the Foundry release, since content changes without a new release.
- The pinned release stays recorded as the content's provenance for the Legal page and NOTICE.md, and as the
  Foundry system version the exporter targets until it is moved on deliberately.
- Packs for later books (Player Core 2, GM Core, Monster Core) are each their own one-off import, possibly at a
  newer pin; each pack records the release it came from.
