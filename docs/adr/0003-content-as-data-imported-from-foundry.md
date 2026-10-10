# 0003. Content as data in Postgres, imported from Foundry pf2e

- Status: Accepted
- Date: 2026-10-08

## Context

The remastered core alone is thousands of entries. Homebrew must use the same path as official content. Content
currently lives in TypeScript libraries (`libs/content/*`), which homebrew cannot use and which will not scale.
The Foundry pf2e system already maintains machine-readable remaster content with rule elements, published under
ORC, and is the export target we need anyway.

## Decision

- Content is data: rows in `content_entries`, grouped into packs, official and homebrew alike.
- Official packs are generated from a pinned foundryvtt/pf2e release by `tools/content-import`, committed as JSON
  under `content/packs`, reviewed as diffs, and upserted on deploy.
- Only remaster, ORC-licensed content is imported first. Rules text is stored and shown with ORC attribution;
  NOTICE.md is updated accordingly.
- The TS content libraries are retired.

## Consequences

- Content coverage is limited by our rule element translator; the importer's coverage report is the backlog.
- We depend on Foundry's data quality and release cadence; errata arrives through re-import.
- Page numbers and AoN URLs are not in Foundry data and need a separate enrichment source.
- Content ids remain UUIDv5 of `<pack>/<slug>`; Foundry ids are kept as external ids for export.
