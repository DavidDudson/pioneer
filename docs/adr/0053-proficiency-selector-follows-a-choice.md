# 0053. A Proficiency selector can follow a ChoiceSet pick

- Status: Proposed
- Date: 2026-10-13

## Context

Skill Training, a dedication's skill training and Canny Acumen raise the rank of a skill the player picks. Foundry
writes the raise as an `ActiveEffectLike` on `system.skills.{item|flags.system.rulesSelections.<flag>}.rank`, the
pick a `ChoiceSet` on the same item stored. Pioneer's `Proficiency` named its selector outright, so these stayed in
the importer's backlog (ADR-0008). Without them a feat prerequisite on a skill rank, or on Perception, could not
settle for a character who took one of these feats, and Perception ranks were not read at all (#466).

Alternatives:

- **Resolve in the engine** from a map of picks passed through `ModifierInputs`. Every caller that builds rules
  would carry the picks, and the builder, which reads skill ranks from the grants, would resolve them a second way.
- **A `ChoiceSet` option per skill, each granting its own `Proficiency`.** Sixteen near-identical options on every
  such feat, and nothing like the Foundry data to import from.
- **Resolve in the grant resolution's rules** (chosen).

## Decision

- `Proficiency.selector` is a `Selector` or a `ChoiceSelector { choice, prefix }`: the pick the `ChoiceSet` flagged
  `choice` on the same entry stored, after `prefix` and a colon (`skill` and a pick of `athletics` is
  `skill:athletics`).
- `resolvedRules` (`@pioneer/rules/grants`) lists the rule elements of the entries in the effective set with every
  choice-driven selector replaced by the selector its pick makes. A selector whose pick is still to make, or makes no
  selector, raises nothing and the element is left out. The engine's `ranksInPlay` and the character domain's skill
  ranks read only resolved elements, so a `ChoiceSelector` that reaches them is ignored.
- The importer maps an upgrade of `system.skills.{item|flags.system.rulesSelections.<flag>}.rank` to a fixed rank to
  a `Proficiency` with `{ choice: <flag, kebab-cased>, prefix: 'skill' }`.
- The character domain reads Perception ranks beside skill ranks (`perception:rank:<n>`), so a Perception
  prerequisite settles from the raises alone.
- A Lore feat's level-scaled override (`mode: override` on a `-lore` skill, with a formula value) stays in the
  backlog: its rank is a formula of the character's level, and `Proficiency` takes a rank by name. It needs a
  formula-valued `Proficiency`, a schema change of its own.

## Consequences

- The sheet, the builder's skill slots and feat prerequisites agree on a picked skill's rank, and the engine knows
  nothing of picks.
- `Proficiency.selector` is no longer always a string, so code reading it must handle the choice form or read
  `resolvedRules`.
- A pick naming no skill (a Lore topic in a `ChoiceSet` of free text) raises nothing instead of reporting an error.
