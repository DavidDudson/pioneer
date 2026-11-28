# 0087. Hand-edited rules text comes from Foundry first, then Archives of Nethys

- Status: Proposed
- Date: 2026-11-28
- Supersedes: the hand-edit sourcing bullet of [0031](0031-official-packs-imported-once-from-foundry.md)

## Context

ADR-0031 lets a hand edit to an official pack take rules text only "from the source book or the pinned Foundry data",
with Archives of Nethys limited to page numbers and links. Twenty vocabulary traits have no text in the pinned
Foundry release. We have no copy of the books to read them from, and Archives of Nethys publishes the same rules text
under the ORC License. The rule left those traits empty, so their cards showed only a name.

## Decision

1. **Foundry first.** Text for a hand edit comes from the pinned Foundry data when it has any. The importer fills it,
   and a hand edit never replaces text Foundry supplies.
2. **Archives of Nethys second.** Where the pinned data has none, the text may be copied from the entry's Archives of
   Nethys page, with the entry's source reference kept. Only ORC-licensed entries qualify (NOTICE.md); an entry
   under the Open Game License keeps its own rules.
3. **Nothing invented.** Where neither has text (Archives of Nethys notes "no description was provided"), the entry
   stays empty. It is listed with that reason in the guard spec (`trait-descriptions.test.ts`), which shrinks as text
   arrives.
4. **A remastered entry uses the remaster's page.** Where a name changed (Duergar to Hryngar, Locathah to Athamaru),
   the text comes from the page of the name the pack carries, not the pre-remaster page.

## Consequences

- Fourteen of the twenty traits get a description; six stay empty with a recorded reason.
- Pack text now has two upstream sources. A Foundry release that adds text for a filled trait needs a manual look,
  since the committed text stands (ADR-0031).
- The `content-import` skill's rule that hand edits come from the book or Foundry no longer holds in full.
