# 0069. AoN pages and URLs come from mapping files, not from AoN's servers

- Status: Proposed
- Date: 2026-10-19

## Context

Foundry's entries name their book but carry no page number and no Archives of Nethys URL. Our `SourceRef` accepts a
book without either (ADR-0005, amended), and the coverage report counts what is missing. Epic 2.7 fills them in. The
open question was how to get that data within AoN's terms.

What the spike found, on 2026-10-19:

- AoN's licence page says the site "uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's Community
  Use Policy". It says nothing about copying the site's data, about automated access, or about an API.
- There is no `robots.txt` (404), no published API and no data feed.
- The site's own pages read an undocumented Elasticsearch endpoint. It is an implementation detail of AoN's front end,
  not an offered interface, and nothing says third parties may use it.
- The contact page gives a site owner address and Discord channels, and nothing about data requests.
- Paizo and AoN's July 2026 agreement replaced their commercial licence with a looser arrangement and says nothing about
  third-party use of AoN's data.
- A page number is printed in the book. An exact AoN URL is a fact about where an entry lives. Neither is AoN's
  prose, but the way AoN's index is built and ordered is its work, and nothing grants us the right to take it in bulk.

## Decision

- **No code of ours calls AoN's servers.** No scraper, no use of its Elasticsearch endpoint, no CI step, no importer
  flag. Not at a low rate and not once. Nothing that needs AoN to be up, or to agree, runs in our tooling.
- **The data enters through committed mapping files** (`content/enrichment/<pack>.json`, story _enrichment mapping
  files_): entry slug to book, page and AoN URL. They are written by people, and checked by a schema (the URL is on
  `2e.aonprd.com` and names one entry, never a search page).
- **Pages come from the books.** A contributor with the book (or the PDF they bought) reads the page number off it. This
  is the main source and needs nobody's permission.
- **URLs are entered by hand, or from a listing AoN gives us.** A contributor may paste the URL of an entry they looked
  up in a browser. The matcher (story _matcher proposes mappings_) reads a listing file it is handed, so it works the
  same on a hand-made list or on an export AoN agrees to share, and never fetches one.
- **We ask AoN.** The maintainer writes to the site owner for permission to use a page and URL listing, or for AoN to
  publish one. Until an answer says yes, the matcher's input is hand-made. A yes changes only where the listing file
  comes from, not the pipeline.
- **A URL is optional** (ADR-0005 stays as amended). A page without a URL, or a book alone, is valid. The coverage
  report shows the gap, and Epic 9.5's gate ratchets it (thresholds, with listed exceptions).

## Consequences

- Enrichment is slower and manual until AoN answers. The mapping format and matcher are written once, so a yes means
  dropping in a file.
- Page numbers can be finished from the books alone. URL coverage depends on contributor time or on AoN.
- We never depend on an undocumented endpoint that could change, vanish or be closed to us, and we take no position
  that its use is allowed.
- A wrong URL is a data error: `type:content` issues, fixed in the mapping file and re-applied (`content-enrich` never
  overwrites a hand-set value, so the fix is made in the pack as well).

## Alternatives considered

- **Scrape AoN, or query its Elasticsearch endpoint, once.** Fast and complete, but the terms are silent, not
  permissive. ADR-0031 made committed packs the source of truth, so a one-off would leave scraped data we cannot later
  disown.
- **Link to AoN search pages.** No data needed, but `SourceRef` requires an exact entry, and a search page is not a
  source.
- **Drop the AoN link.** The book and page are enough to find an entry, but the link is the part readers use. Kept
  optional and pursued through permission.
