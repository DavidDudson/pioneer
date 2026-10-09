import { evaluate, FormulaText, FormulaValue, parseFormula } from '@pioneer/rules/formula';
import type { ResolveReference, TextPosition } from '@pioneer/rules/formula';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { AdjustMode, RuleNumber } from '@pioneer/rules/sdk';
import type { ChangeMode, Level, ModifierValue, Predicate, RuleValue } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** Resolves a rule element's formula references, given the level of the item it is on. */
export type ResolveFor = (itemLevel: Level | undefined) => ResolveReference;

/** What rule elements need besides themselves: the facts predicates read and the formula references' values. */
export interface RuleContext {
  readonly facts: PredicateFacts;
  readonly resolve: ResolveFor;
}

export interface ValueFailure {
  readonly ok: false;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

/** A rule element's number, or why its formula has none. */
export type ValueOutcome = { readonly ok: true; readonly value: RuleNumber } | ValueFailure;

/** A number as written, or a formula evaluated with the references' values. */
export function valueOf(value: ModifierValue | RuleValue, resolve: ResolveReference): ValueOutcome {
  if (typeof value === 'number') {
    return { ok: true, value: RuleNumber.parse(value) };
  }
  const parsed = parseFormula(FormulaText.parse(value));
  if (!parsed.ok) {
    return parsed;
  }
  const outcome = evaluate(parsed.formula, resolve);
  return outcome.ok ? { ok: true, value: RuleNumber.parse(outcome.value) } : outcome;
}

/**
 * `current` changed by `change` in `mode`, rounded down as PF2e rounds (`multiply` by 0.5 halves a +3 to +1). The
 * modes of `AdjustModifier` and `Change` share their names.
 */
export function changed(mode: AdjustMode | ChangeMode, current: FormulaValue, change: RuleNumber): FormulaValue {
  switch (mode) {
    case AdjustMode.Add: {
      return FormulaValue.parse(Math.floor(current + change));
    }
    case AdjustMode.Subtract: {
      return FormulaValue.parse(Math.floor(current - change));
    }
    case AdjustMode.Multiply: {
      return FormulaValue.parse(Math.floor(current * change));
    }
    case AdjustMode.Upgrade: {
      return FormulaValue.parse(Math.floor(Math.max(current, change)));
    }
    case AdjustMode.Downgrade: {
      return FormulaValue.parse(Math.floor(Math.min(current, change)));
    }
    case AdjustMode.Override: {
      return FormulaValue.parse(Math.floor(change));
    }
    default: {
      return mode satisfies never;
    }
  }
}

/** A predicate's truth, a missing predicate holding. */
export function truthOf(predicate: Predicate | undefined, facts: PredicateFacts): Truth {
  return predicate === undefined ? Truth.True : evaluatePredicate(predicate, facts);
}
