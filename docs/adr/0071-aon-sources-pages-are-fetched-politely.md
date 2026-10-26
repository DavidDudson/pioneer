# 0071. AoN Sources pages are fetched politely and cached as name-to-URL tables

- Status: Proposed
- Date: 2026-10-26
- Supersedes: the "No code of ours calls AoN's servers" and "We ask AoN" decisions of ADR-0070

## Context

ADR-0070 ruled out any code of ours calling AoN, and planned to ask the site owner for a page and URL listing. The
maintainer will not ask for a listing. What we need is smaller than a listing: each book's `Sources.aspx?ID=<n>` page
is a public lookup table, one list per entry type (`Spells [537]`), each row a name and the exact entry URL
(`Spells.aspx?ID=491`). It carries no page numbers and none of AoN's prose.

Facts from fetching `Sources.aspx?ID=1` once, on 2026-10-26:

- There is still no `robots.txt` (404). The page is server-rendered HTML with an `ETag`.
- Entry URLs can carry extra parameters (`Skills.aspx?ID=1&General=true`).
- The terms remain silent on automated access, as ADR-0070 found. Silence is not permission, and the way AoN's index is
  built and ordered is its work. This ADR takes that risk knowingly and keeps it small.

## Decision

- **Only Sources pages are fetched.** Never a search page, never AoN's Elasticsearch endpoint, never an entry page.
- **Fetching is a developer-run script, never part of CI, the importer, the API or the web app.** Nothing that builds,
  tests or serves Pioneer needs AoN to be up.
- **The script is a polite robot.** A descriptive `User-Agent` naming the project and a contact address, no more than
  one request every 2 seconds, one request at a time, conditional requests (`If-None-Match` with the stored `ETag`), a
  stop on any 403, 429 or 5xx rather than a retry loop, and a `Retry-After` always honoured. It re-checks
  `robots.txt` on every run and refuses to fetch if one appears that disallows the path.
- **We keep only the lookup table.** The script stores, per book, entry type, name and URL, in a listing file. It does
  not store the HTML or any AoN prose. The URL and the name are facts about where an entry lives.
- **Mapping files stay the source of truth** (ADR-0070). The matcher reads the listing file to propose mappings, a
  person reviews them, and the committed `content/enrichment/<pack>.json` is what the app reads. Pages still come from
  the books.
- **Rights-holder requests win.** If AoN or Paizo asks us to stop, the script and the listing file are removed.

## Consequences

- URL coverage no longer waits for contributor time or for AoN to answer.
- We make a handful of requests per book, and only when a developer runs the script.
- A wrong or stale URL is still a data error, fixed in the mapping file and re-applied.
- We have not been given permission. The mitigation is volume, honesty about who we are, and the ability to stop at
  once.

## Alternatives considered

- **Keep ADR-0070 as is.** Safest, but slow and manual, and the maintainer will not make the request it depends on.
- **Scrape every entry page or use the Elasticsearch endpoint.** Far more requests, takes AoN's prose or relies on an
  undocumented interface.
- **Fetch at import or CI time.** Makes builds depend on AoN and multiplies requests.
