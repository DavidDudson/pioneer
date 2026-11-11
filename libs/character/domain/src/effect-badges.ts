import { DiceExpressionText, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import type { DamageFormula } from '@pioneer/rules/sdk';

import { EffectBadgeValue } from './effects';
import type { CounterTerms } from './effects';

/** Whether `formula` is a plain dice expression that `rollBadge` can roll. */
export function canRollBadge(formula: DamageFormula): boolean {
  return parseDiceExpression(DiceExpressionText.parse(formula)).ok;
}

/**
 * What a formula badge rolls. A formula that reads the character (`@attr.str`) is not a plain dice expression, so it is
 * not rolled here and has no value.
 */
export function rollBadge(formula: DamageFormula, random: RandomSource): EffectBadgeValue | undefined {
  const parsed = parseDiceExpression(DiceExpressionText.parse(formula));
  return parsed.ok ? EffectBadgeValue.safeParse(rollDice(parsed.expression, random).total).data : undefined;
}

/**
 * The value a counter badge steps to from `value`, one step `up` or down: held at its bounds, or looping past them
 * when the content says so. A badge with no bound on a side has no end there.
 */
export function steppedBadge(terms: CounterTerms, value: EffectBadgeValue, up: boolean): EffectBadgeValue {
  const next = value + (up ? 1 : -1);
  const { min, max, loop } = terms;
  if (max !== undefined && next > max) {
    return EffectBadgeValue.parse(loop && min !== undefined ? min : max);
  }
  if (min !== undefined && next < min) {
    return EffectBadgeValue.parse(loop && max !== undefined ? max : min);
  }
  return EffectBadgeValue.parse(next);
}
