# 0016. Formula references use Pioneer's own paths, translated from Foundry's

- Status: Proposed
- Date: 2026-10-09

## Context

Formulas (`10 + @attr.dex.capped + @prof.ac`, `max(1, floor(@level / 2))`) read character and item values through
`@` references. The parser only checks their syntax (`libs/rules/formula`); which paths exist and what they mean is
undecided. Two spellings are in play:

- The rules-engine doc writes short paths over Pioneer's own model: `@level`, `@attr.dex.capped`, `@prof.armor`.
- Foundry pf2e content uses paths into its actor and item documents: `@actor.level`, `@item.level`,
  `@actor.abilities.str.mod`, `@actor.system.skills.athletics.rank`, `@item.badge.value`.

Statistic base formulas and rule element values must share one vocabulary, and content is imported from Foundry and
exported back to it (ADR-0003, ADR-0008).

Options:

1. Foundry's paths as written. Import and export copy formulas unchanged, but statistic formulas and homebrew are
   written against Foundry's document model, with several spellings for one value (`@actor.level` and
   `@actor.system.details.level.value`) and no way to tell a meaningful path from a typo without mirroring that
   model.
2. Accept both. Import friction is lowest, but stored content has two spellings for one value and the catalogue
   carries an alias table forever.
3. Pioneer's own paths, with Foundry's translated on import and back on export. One short spelling per value over
   Pioneer's model, checked against a closed catalogue. This is what ADR-0008 did for path-based rule elements
   (`ActiveEffectLike` became `Change` on a selector).

## Decision

Option 3. Stored formulas use Pioneer's paths only, and a Foundry path in stored content is an unknown reference.

The catalogue is `formula-reference.ts` in `libs/rules/sdk`. It lists each path with its scope (actor or item) and
meaning, and the Foundry spellings that translate to it, with matching placeholders (`actor.abilities.<attribute>.mod`
to `attr.<attribute>`). `docs/architecture/rules-engine.md` ("Formula references") documents the vocabulary.

- The importer (Epic 2.5, translators in Epic 2.6) rewrites each Foundry reference with the catalogue's table and
  reports any reference the table does not cover, as it does for rule elements it cannot translate.
- The exporter (Epic 8.3) writes the table's first Foundry spelling for each path. Paths without a Foundry spelling
  (`@attr.dex.capped`, `@prof.<selector>`) only occur in Pioneer's own statistic formulas, which are not exported.
- The table grows with the engine: a path joins the catalogue when the engine can supply its value.

## Consequences

- Rule element and statistic formulas are checked when content is validated: they must parse, and every reference
  must be in the catalogue. Typos fail at import or authoring time instead of evaluating to an unknown reference.
- A Foundry spelling in authored content gets an error naming the Pioneer path to write instead.
- `@item.level` is spelled the same in both systems; everything else under `@actor.` changes on import.
- Formulas inside Foundry's bracketed values and `{item|...}` injections are not covered here; they belong to the
  Epic 2.6 translator stories.
