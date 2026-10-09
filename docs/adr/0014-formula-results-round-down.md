# 0014. Formula results are whole numbers, rounded down

- Status: Proposed
- Date: 2026-10-09

## Context

ADR-0008 makes rule elements follow Foundry's semantics, and formulas in them (`FlatModifier.value`, statistic base
formulas) are evaluated the way pf2e evaluates them: JavaScript arithmetic through `Roll.safeEval`. Foundry does not
round the result, so an unwrapped `@actor.level / 2` gives a modifier of 2.5 at level 5. Pioneer's statistics,
breakdowns and stacking work in whole numbers, so a formula needs a whole-number result.

Options:

1. Keep fractions and let each consumer round. Matches Foundry, but every statistic, modifier and breakdown has to
   handle non-integers and choose a rounding of its own.
2. Truncate towards zero (`Math.trunc`). Whole numbers, but `-5 / 2` becomes -2, which is not how PF2e rounds.
3. Round to nearest (`Math.round`). Not a PF2e rule anywhere.
4. Round down (`Math.floor`) once, at the end. The PF2e default ("Rounding", Player Core: round down unless told
   otherwise).

## Decision

The evaluator keeps JavaScript's fractions through the whole formula, as Foundry does, and rounds the final value
down to a whole number (option 4). `floor`, `ceil` and `round` inside a formula still see the fractions.
`docs/architecture/rules-engine.md` ("Evaluation and rounding") is the detailed specification.

## Consequences

- A formula that already rounds explicitly, as Foundry content does where a fraction matters, gives the same value in
  both systems. One that does not differs only by the fraction Foundry would keep.
- Export to Foundry (`libs/interop/foundry`) wraps any formula whose value can be fractional, meaning one with an
  unwrapped division, in `floor(...)`, so Foundry shows the value Pioneer does. The importer can report such
  divisions in imported content.
- This is a narrow exception to ADR-0008's "follow Foundry's semantics"; other differences in formula evaluation are
  listed in the rules-engine doc.
