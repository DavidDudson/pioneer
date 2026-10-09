# 0008. Foundry-aligned rule element semantics, typed schema

- Status: Proposed
- Date: 2026-10-08

## Context

We import from Foundry pf2e and export to it. Foundry's rule elements are battle-tested against the whole rules
corpus, but some (`ActiveEffectLike`) target raw document paths such as `system.attributes.ac.value`, which ties
content to Foundry's data model and cannot be validated or explained well.

## Decision

Our rule elements follow Foundry's names and semantics (`FlatModifier`, `GrantItem`, `ChoiceSet`, `RollOption`,
`AdjustModifier`, `DamageDice`, ...) and its predicate syntax. Path-based elements are replaced by typed
equivalents (`Change` on a selector, `Proficiency` on a statistic). Each element has a zod schema; unknown fields
are errors. Translation in both directions lives in `libs/interop/foundry`.

## Consequences

- Most imported rule elements translate one to one; path-based ones need per-path translators.
- Homebrew authors learn one vocabulary that also exports cleanly to Foundry.
- When Foundry adds or changes an element, the importer reports it and we decide whether to follow.
- Formula results are rounded down to whole numbers, where Foundry keeps fractions (ADR-0014).
