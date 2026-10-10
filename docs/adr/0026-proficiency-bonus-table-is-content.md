# 0026. The proficiency bonus table is content, replaced by a rule element

- Status: Proposed
- Date: 2026-10-10

## Context

Every statistic built on proficiency reads `@prof.<selector>`. The engine computed it in code
(`proficiencyBonus` in `libs/rules/sdk`): 0 when untrained, otherwise 2, 4, 6 or 8 plus level. GM Core's
Proficiency Without Level variant changes that mapping for a whole game: untrained -2, trained 2, expert 4, master
6, legendary 8, with no level. rules-engine.md names it as an acceptance test: if a variant like this needs an engine
change, homebrew will too.

Two questions: where the mapping lives, and how a variant replaces it.

Shape options:

1. One formula over the rank and level, such as `ternary(eq(@rank, 0), 0, @rank * 2 + @level)`. It needs a
   reference that exists only inside this formula, and the variant's version is another chain of `ternary` calls.
2. A table with one formula per rank, each reading only `@level`. It reads like the book's table, needs no new
   reference, and each rank can be checked on its own.

Replacement options:

1. `Change` on a reserved selector (`proficiency:trained`). No new element, but a magic selector per rank, and
   `Change` formulas cannot see which rank is asked for.
2. A new rule element carrying a whole table. Foundry has no counterpart: it makes the variant a world setting.

## Decision

The table, option 2 for both.

- `ProficiencyBonusTable` in `libs/rules/sdk` has a formula per rank (`untrained` to `legendary`). Each is an actor
  formula that may read only `@level`: `@prof` or `@stat` would read the table it belongs to.
- A content pack may define `proficiencyBonus`. The core rules pack does, with Player Core's values.
  `ContentRegistry#proficiencyBonus()` returns the last registered pack's table, so homebrew registered after core can
  restate it. The engine takes it with the definitions (`StatisticContent`), and `statisticContent(registry)` builds
  both from a registry.
- The `ProficiencyBonus` rule element carries a whole table and replaces the content's table for the character it is
  on. Of several whose predicate holds, the last by priority and then id wins, as set overrides choose. A situational
  one does not apply, since the sheet cannot show every statistic both ways.
- Packs define variant rules (`variantRules`: slug, name, sources, rules). The core rules pack has
  `proficiency-without-level`, whose one rule is a `ProficiencyBonus` with GM Core's table.
  `variantRulesInPlay` puts an enabled variant's elements in play with a `variant` origin hop, so a variant flows
  through the same rule pipeline as anything else.
- Each base term that reads `@prof` carries the replacing element's origin, so the breakdown says which variant set
  the bonus. Modifier formulas that read `@prof` use the replaced table too.

## Consequences

- Proficiency Without Level is data: no engine code knows about it, and a homebrew table is one rule element.
- `deriveStatistics` takes the table with the definitions; a derivation without a table is not possible, so an
  app derives only once the core rules pack has loaded.
- Export to Foundry (Epic 2.6) will map an enabled `proficiency-without-level` to its world setting. Any other `ProficiencyBonus`
  has no Foundry form and will be reported as untranslatable.
- Choosing which variants a campaign or character enables (the toggle on the sheet) is Epic 1.7; the engine already
  takes them as rules in play.
