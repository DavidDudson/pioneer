# 0002. Three-valued predicates for conditional modifiers

- Status: Proposed
- Date: 2026-10-08

## Context

Many modifiers depend on the situation: "+2 to initiative when rolling Stealth", "+1 to Seek in forests". Foundry
evaluates predicates only at roll time, so its sheet hides them. We want them visible on the sheet as conditional
adjustments and resolved at roll time.

## Decision

Predicates keep Foundry's JSON syntax but are evaluated with Kleene three-valued logic. Roll option namespaces are
classified as known (absent means false) or situational (absent means unknown). Unknown predicates produce
conditional breakdown lines with a human-readable summary. Roll dialogs offer them as toggles and record the
choice.

## Consequences

- Imported predicates work unchanged; only the namespace classification table is ours.
- A namespace misclassified as known would hide conditional modifiers; the table needs tests and review.
- Summaries are generated from a vocabulary table with authored overrides for awkward cases.
- Numeric comparisons (`{ "gte": ["target:level", 5] }`) treat an option as settled once any value of it is given,
  so a roll with a known target answers definitely. Supplying a second value of the same option could change that
  answer; callers give one value per option.
