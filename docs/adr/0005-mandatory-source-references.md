# 0005. Every content entry has a source reference

- Status: Proposed; enrichment by the importer superseded by [0031](0031-official-packs-imported-once-from-foundry.md);
  a book source's page or AoN link made optional by the amendment below
- Date: 2026-10-08

## Context

Players and GMs need to check rulings against the book. Homebrew needs attribution. Mixed official and homebrew
content is only trustworthy if the origin of each rule is visible.

## Decision

`sources` is required and non-empty on every content entry. A book source names a registered book and has a page,
an exact `2e.aonprd.com` URL, or both. Web and homebrew sources are also allowed. Books are a registry
(`content/books.json`) with licence and remaster flag.

### Amendment: a book source may cite the book alone (2026-10-11, #400)

Foundry has the book title of every entry but no page numbers or AoN links, and how AoN data may be obtained is
still open (content-model.md, "Source enrichment"). Requiring a page or link would keep every imported pack out of
the repository until enrichment finishes. Alternatives: a separate source shape accepted only in official packs (two
shapes for one thing, and homebrew citing a book has the same gap), or holding the import back.

A book source's `page` and `aon` are each optional. The entry still names its book, so its origin is visible; the
source line shows the book without a page, and the coverage report counts entries with a page and with an AoN link
per kind and lists them per book.

## Consequences

- Enrichment adds page numbers and AoN URLs to the committed packs after the import (ADR-0031); gaps are reported by
  the coverage report.
- Every UI that shows content shows its source line.
- Homebrew authoring cannot save an entry without a source (author attribution is filled automatically).
