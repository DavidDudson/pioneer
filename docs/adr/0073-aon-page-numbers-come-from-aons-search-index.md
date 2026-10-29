# 0073. AoN page numbers come from AoN's search index, fetched politely

- Status: Proposed
- Date: 2026-10-27
- Supersedes: the "only Sources pages", "never AoN's Elasticsearch endpoint" and "pages still come from the books"
  decisions of ADR-0071

## Context

ADR-0071 gave every committed entry an AoN URL without page numbers, and left pages to be read from the books. The
maintainer will not supply them by hand, and AoN prints a page for most entries (`Player Core pg. 331`).

Facts from two requests to `https://elasticsearch.aonprd.com/aon/_search` on 2026-10-27:

- The endpoint answers unauthenticated JSON `POST`s. Each hit carries `url`, `name`, `category` and `source_markdown`,
  for example `[Player Core](/Sources.aspx?ID=216) pg. 331`. The Sources ID is the one in each book's `aonSourceUrl`.
- `robots.txt` on that host answers **403**, not 404. ADR-0071 treats an unreadable `robots.txt` as a refusal.
- The terms remain silent on automated access. This ADR takes that risk knowingly and keeps it small.

## Decision

- **Only the search index is queried, by book.** One query per book filters on its Sources ID and pages through the
  hits. No entry page and no other AoN page is fetched.
- **The same developer-run robot as ADR-0071.** The descriptive `User-Agent` with a contact, one request at a time and
  2 seconds apart, a stop on any 403, 429 or 5xx on the query (honouring `Retry-After`), and a `robots.txt` check on
  every run. It never runs in CI, the importer, the API or the app.
- **A 403 on `robots.txt` of the search host is read as "none published".** The host serves only this JSON API, and
  answers the query itself with 200. A `robots.txt` that is readable and disallows the path still stops the run, and
  so does any other status. The page-fetch client keeps ADR-0071's stricter rule.
- **We keep only facts.** Per book, the tool stores each entry's URL and page in `content/aon/pages/<book>.json`. For
  an entry the book's Sources page does not list (an action, say), it also stores the entry's name and type, so the
  matcher can find its URL. It stores no prose, no markup and no other field of the index.
- **Mapping files stay the source of truth** (ADR-0070). `content:pages-propose` copies a page from the table into
  `content/enrichment/<pack>.json` for each mapping that has an AoN URL, never over a page already there. A person
  reviews the diff, and `just content-enrich` writes it onto the pack.
- **Some entries get no URL on purpose.** A class feature has no page of its own on AoN: every one points at its class
  page, so we leave it out instead of giving it the class's URL. A creature's own ability, written "(Creature)
  Ability", and a familiar or eidolon ability have no row either. The matcher never guesses one.
- **Rights-holder requests win.** If AoN or Paizo asks us to stop, the tool and the tables are removed.

## Consequences

- Page coverage no longer waits on the books. Wrong or missing pages are fixed in the mapping file.
- About a hundred requests in all, and only when a developer runs the tool.
- The index is undocumented and may change shape. The tool validates every hit and stops on one it cannot read.
- We have not been given permission. The mitigation is volume, honesty about who we are, and the ability to stop at
  once.

## Alternatives considered

- **Scrape each entry page.** About 12,000 requests and AoN's prose in hand. Heavier on AoN for the same facts.
- **Read pages from the books.** Accurate, but it needs contributor time that is not coming.
- **Treat the 403 as a refusal.** Safest, and it ends this approach.
