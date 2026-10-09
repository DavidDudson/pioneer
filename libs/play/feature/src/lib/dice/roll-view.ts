import { DiceExpressionText, formatExpression, formatTerm, Sign } from '@pioneer/rules/dice';
import type { DieResult, RollResult, RollTotal, TermResult } from '@pioneer/rules/dice';

import { DAMAGE_CATEGORY_KEYS, DAMAGE_TYPE_KEYS } from './dice-labels';

/** One term of a roll as shown: signed notation, damage labels, dice and its share of the total. */
interface TermView {
  readonly notation: DiceExpressionText;
  /** Message keys for the term's damage category and type, in that order. */
  readonly damageKeys: readonly string[];
  readonly dice: readonly DieResult[];
  readonly value: RollTotal;
}

export interface RollView {
  readonly id: number;
  readonly notation: DiceExpressionText;
  readonly total: RollTotal;
  readonly terms: readonly TermView[];
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

export function rollView(id: number, result: RollResult): RollView {
  return {
    id,
    notation: formatExpression(result.expression),
    total: result.total,
    terms: result.terms.map(termView),
  };
}
