# 0038. Skill slots come from class data, opened by the character domain

- Status: Proposed
- Date: 2026-10-11

## Context

The builder must open a character's trained skill slots and skill increases (#464). Foundry pf2e keeps a class's
increase schedule as `skillIncreaseLevels` (Player Core's 3rd and every second level; a rogue's every level from
2nd) and its trained skill count as `trainedSkills.additional`; neither is a rule element. The count of trained
skills also depends on the Intelligence modifier, at 1st level and at each later boost that raises it, and on how many
skills the grants train twice (Player Core lets the player train another instead). A skill increase raises a skill one
rank, within caps by level (master from 7th, legendary from 15th), so its offer depends on the ranks before it.

Alternatives:

- **A `ChoiceSet` per skill increase on the class**, as feat slots are, with the grants engine opening it. Keeps the
  schedule in rules, but a `ChoiceSet` pick grants an entry or stores a flag; it can't mean "raise this skill one rank
  from wherever it is", and its offer can't depend on the ranks the slots before it reached. The engine would need a
  new element or special-cased flags, and the trained skill count, which depends on Intelligence, would still need
  slots outside the engine.
- **Slots in the grants engine, as root slots** (ADR-0032). Root slots offer entries of a kind by content alone; these
  read attribute modifiers and earlier picks, which the engine does not know.

## Decision

- `ClassData.skillIncreaseLevels` keeps Foundry's schedule; absent, Player Core's. The importer keeps it rather than
  reporting it as a gap.
- The character domain opens the slots itself (`skillSlots`), like attribute boosts: `skill-training:<level>:<n>` and
  `skill-increase:<level>`, read in order by level, each over the grants at its level and the picks before it.
  `characterSlots` and `slotRefusal` list and check them beside the engine's slots, so slot status on read (ADR-0035)
  and the pickers see one list.
- Player Core's caps by level (master from 7th, legendary from 15th) are code, as attribute boosts' partial boost
  rule is.
- A pick is a skill's or Lore's `statistic` entry, so Lores are named entries and no free text is stored.

## Consequences

- A homebrew class sets its own schedule with `skillIncreaseLevels`; a variant that changes the caps needs code.
- Slot production is split, as ADR-0032 avoided for root slots: boosts, flaws and now skills are the character
  domain's, `ChoiceSet` and root slots the engine's. Each new domain slot family is added to `characterSlots` and
  `slotRefusal`.
- A custom-named Lore with no loaded statistic is picked by name as `lore:<topic>`, with the name kept on the
  character and the statistic derived, never stored (character-model.md, "Custom-named Lores").
