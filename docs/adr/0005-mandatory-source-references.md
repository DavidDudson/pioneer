# 0005. Every content entry has a source reference

- Status: Proposed
- Date: 2026-10-08

## Context

Players and GMs need to check rulings against the book. Homebrew needs attribution. Mixed official and homebrew
content is only trustworthy if the origin of each rule is visible.

## Decision

`sources` is required and non-empty on every content entry. A book source names a registered book and has a page,
an exact `2e.aonprd.com` URL, or both. Web and homebrew sources are also allowed. Books are a registry
(`libs/rules/catalog/src/books.json`) with licence and remaster flag.

## Consequences

- The importer must enrich Foundry data with page numbers and AoN URLs; gaps are reported by the coverage report.
- Every UI that shows content shows its source line.
- Homebrew authoring cannot save an entry without a source (author attribution is filled automatically).
