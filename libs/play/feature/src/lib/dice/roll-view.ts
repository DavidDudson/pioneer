import { DiceExpressionText, formatExpression, formatTerm, RollMode, Sign } from '@pioneer/rules/dice';
import type {
  DiceExpression,
  DieResult,
  FortunedRoll,
  FortuneRollEntry,
  RollTotal,
  TermResult,
} from '@pioneer/rules/dice';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { DAMAGE_CATEGORY_KEYS, DAMAGE_TYPE_KEYS } from './dice-labels';

/** One term of a roll as shown: signed notation, damage labels, dice and its share of the total. */
interface TermView {
  readonly notation: DiceExpressionText;
  /** Message keys for the term's damage category and type, in that order. */
  readonly damageKeys: readonly string[];
  readonly dice: readonly DieResult[];
  readonly value: RollTotal;
}

/** One roll of the expression; fortune and misfortune make two, and only one is kept. */
export interface AttemptView {
  readonly kept: boolean;
  readonly total: RollTotal;
  readonly terms: readonly TermView[];
}

export interface RollView {
  readonly id: number;
  readonly notation: DiceExpressionText;
  readonly total: RollTotal;
  /** Why one roll or two, and which was kept; unset for a plain roll. */
  readonly explanation: MessageDescriptor | undefined;
  readonly attempts: readonly AttemptView[];
}

function termView(result: TermResult, index: number): TermView {
  const { term } = result;
  const sign = term.sign === Sign.Minus || index > 0 ? term.sign : '';
  const damageKeys = [
    term.tags.category === undefined ? undefined : DAMAGE_CATEGORY_KEYS[term.tags.category],
    term.tags.type === undefined ? undefined : DAMAGE_TYPE_KEYS[term.tags.type],
  ].filter((key) => key !== undefined);
  return {
    notation: DiceExpressionText.parse(`${sign}${formatTerm(term)}`),
    damageKeys,
    dice: 'dice' in result ? result.dice : [],
    value: result.value,
  };
}

function attemptView(entry: FortuneRollEntry): AttemptView {
  return { kept: entry.kept, total: entry.result.total, terms: entry.result.terms.map(termView) };
}

export function rollView(id: number, expression: DiceExpression, roll: FortunedRoll): RollView {
  return {
    id,
    notation: formatExpression(expression),
    total: roll.total,
    explanation: roll.mode === RollMode.Normal ? undefined : roll.explanation,
    attempts: roll.rolls.map(attemptView),
  };
}
