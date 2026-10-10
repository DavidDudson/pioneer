# 0021. Spell casting fields are structured, parsed from Foundry text

- Status: Proposed
- Date: 2026-10-10

## Context

Foundry pf2e stores a spell's casting time, range, targets and duration as free English strings ("1 to 3",
"500 feet", "1 willing living creature or 1 undead", "until the end of the target's next turn"). Story #231 gives
`spell` and `ritual` entries their `data` schemas, which are the importer's target for Epic 2.5. Feat
`prerequisites` and action `requirements` and `trigger` keep Foundry's text as rich text, so that was one option
here too. A structure with a rich-text fallback arm for anything unusual was another.

## Decision

Casting time, range, area, targets and duration are closed structures with no free-text arm
([content-model.md](../architecture/content-model.md#magic-and-play-data)). The importer parses Foundry's strings
into them. A spell whose text doesn't map is reported, not imported with text in place of the field. Cost and
requirements stay rich text: nothing reads them but people.

## Consequences

- The builder, sheet and Foundry export can read a spell's actions, range and duration: filter by cast time, show
  how long an effect lasts, check whether a target is in range.
- Spells with unusual wording (Foundry's "varies", "see text", Heal's variants) aren't importable until the
  structure covers them. The importer's coverage report is that backlog, as ADR-0003 says of rule elements. Each new
  case is a schema change and a migration of nothing, since entries are re-imported.
- Translators work from message keys for units and kinds, not from English strings in content.
