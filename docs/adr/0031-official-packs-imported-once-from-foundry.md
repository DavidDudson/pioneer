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
- Each imported pack has one committed file, `content/import/<pack>.json`, holding its pin (the Foundry release tag
  and the SHA-256 of that tag's source archive) and its backlog: what the import could not translate, per entry, with
  Foundry's raw JSON (rule elements, fields, labels, links). The backlog is the work list for Epic 2.6 (#21) and
  later translator work. It only holds items from selected entries, under the same licence rules; art and image
  references are stripped, and it is never seeded, served or bundled.
- The importer downloads the tag's source archive from GitHub (`archive/refs/tags/<tag>.tar.gz`), checks it
  against the pack's SHA-256 and stops on a mismatch. Moving a pack's pin is a PR that changes the tag and checksum
  together. Release assets were rejected: `system.zip` holds built LevelDB packs, and `json-assets.zip`, though its
  bytes are stored and stable, holds build output (one file per pack) rather than the JSON sources, and is a zip,
  which Bun's archive reader does not open. A commit SHA fetched with git was rejected as a second tool for no gain. GitHub
  generates source archives on request and changed their bytes once before (January 2023): if a checksum stops
  matching for an unchanged tag, the import stops, and the pin is re-taken by PR after diffing the extracted tree.
- Hand edits to official packs follow NOTICE.md's contributor checklist like any pack: rules text from the source
  book or the pinned Foundry data, and nothing from Archives of Nethys beyond page numbers and links.
- A translator that lands after its pack is imported is applied to the backlog, not by re-importing: a command,
  built by Epic 2.6 (#21), translates the backlog items it now covers, appends them to the committed entries' rules
  and removes them from the backlog. Hand edits to those entries are kept.
- The coverage report runs over the committed packs and their backlog, in CI on PRs touching `content/`. It
  reports; it never fails the build.
- Supersedes ADR-0003's generated packs, errata by re-import and importer backlog, and ADR-0005's enrichment by the
  importer; content as data, remaster-only selection, the id scheme and mandatory sources stand.

## Consequences

- Fixes to official content are one PR against the JSON, no importer change and no overlay file.
- Foundry errata after the import does not arrive on its own. It is applied by hand, guided by a diff of Foundry's
  releases for the imported entries; nothing tracks it automatically.
- A schema change to a kind migrates the committed JSON with a script in the same PR, amending ADR-0021's "migration
  of nothing".
- An exported actor's generation (ADR-0022) combines the exporter's version with the content hashes (ADR-0029) of
  the official packs the actor uses, instead of the Foundry release, since content changes without a new release.
- Each pack's release stays recorded as its provenance: the Legal page and NOTICE.md name the release each pack was
  imported from and say the packs have since been edited by Pioneer contributors. The Foundry system version the
  exporter targets is its own setting, not read from the pins.
- Packs for later books (Player Core 2, GM Core, Monster Core) are each their own one-off import, possibly at a
  newer pin; each pack records the release it came from.
