# 0077. Replaced legacy entries come from a pre-remaster Foundry pin

- Status: Proposed
- Date: 2026-11-01

## Context

A remaster entry names the legacy entry it replaces in `supersedes` (ADR-0073, `just content-supersedes`), but only
when both entries are in the packs. Of 5,042 pairs in `content/aon/supersedes/*.json`, 5 are linked and 3,807 have
only the remaster entry. The legacy packs are sparse (`core-rulebook` holds 1 entry, `advanced-players-guide` 2).

The pinned Foundry release (`pf2e-8.6.0`) cannot fill them. Foundry rewrote replaced entries in place as remaster
ones, so only 101 of the 4,098 replaced legacy entries with a known name exist there as legacy documents. The last
5.x release (`5.16.1`) still holds the pre-remaster text: about 1,667 of those 4,098 match by name. 944 pairs have no
name in `content/aon/*.json` or `pages/*.json` (the supersedes files hold URLs only), and the rest are renamed or
absent in Foundry, so this source reaches about a third of the pairs at most.

## Decision

- **Scope: every replaced legacy entry**, of any kind (feats, spells, equipment, rules, traits, ...), not only the
  kinds pickers offer. Entries are held back until legacy content is on (the Legacy Content variant rule); no picker
  offers one by default.
- **Source: a second, pre-remaster pin.** Legacy entries are imported once from foundryvtt/pf2e `5.16.1`, under
  ADR-0031's rules: pinned tag and SHA-256, a one-off import, hand-owned JSON afterwards. Each legacy pack records its
  own pin in `content/import/<pack>.json`. Old releases are tagged without the `pf2e-` prefix, so a pin tag is
  `[pf2e-]<major>.<minor>.<patch>`.
- **Selection by replacement.** A legacy Foundry document is imported only if its registry book and name match an
  entry that a key of `content/aon/supersedes/*.json` names. AoN supplies names and URLs for selection and linking
  only; rules text comes from Foundry (NOTICE.md). Only documents Foundry marks Open Game License are taken.
- Entries with no match stay unlinked; `just content-supersedes` reports the unresolved count.

## Consequences

- `just content-supersedes` links roughly a third of the pairs after the import, up from 5. The rest are reported, not
  failed.
- The importer must read 5.x document shapes for the legacy books. Translator gaps land in the pack's backlog like any
  other import.
- Legacy packs grow by up to about 1,700 entries; the content catalog and size budgets must still pass.
