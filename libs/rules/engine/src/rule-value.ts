import { evaluate, FORMULA_VALUE_MAX, FormulaText, FormulaValue, parseFormula } from '@pioneer/rules/formula';
import type { ResolveReference, TextPosition } from '@pioneer/rules/formula';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { AdjustMode, RuleNumber } from '@pioneer/rules/sdk';
import type { ChangeMode, Level, ModifierValue, Predicate, RuleValue } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { EngineMessage } from './messages';

/** Resolves a rule element's formula references, given the level of the item it is on. */
type ResolveFor = (itemLevel: Level | undefined) => ResolveReference;

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

/** `value` rounded down, if it is a number inside the safe integer range; undefined when it is not. */
export function whole(value: unknown): FormulaValue | undefined {
  const parsed = FormulaValue.safeParse(typeof value === 'number' ? Math.floor(value) : value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * `current` changed by `change` in `mode`, rounded down as PF2e rounds (`multiply` by 0.5 halves a +3 to +1);
 * undefined when the result leaves the safe integer range (`multiply` by 1e12). The modes of `AdjustModifier` and
 * `Change` share their names.
 */
export function changed(
  mode: AdjustMode | ChangeMode,
  current: FormulaValue,
  change: RuleNumber,
): FormulaValue | undefined {
  switch (mode) {
    case AdjustMode.Add: {
      return whole(current + change);
    }
    case AdjustMode.Subtract: {
      return whole(current - change);
    }
    case AdjustMode.Multiply: {
      return whole(current * change);
    }
    case AdjustMode.Upgrade: {
      return whole(Math.max(current, change));
    }
    case AdjustMode.Downgrade: {
      return whole(Math.min(current, change));
    }
    case AdjustMode.Override: {
      return whole(change);
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

/** Why a change or adjustment has no result: it left the safe integer range. */
export function outOfRange(
  key: typeof EngineMessage.AdjustmentOutOfRange | typeof EngineMessage.ChangeOutOfRange,
): MessageDescriptor {
  return message(key, { maximum: FORMULA_VALUE_MAX });
}
