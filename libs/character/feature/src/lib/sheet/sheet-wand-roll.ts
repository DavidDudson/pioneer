import { DiceExpressionText, naturalD20, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { DieFace, RandomSource } from '@pioneer/rules/dice';

/** The flat check that overcharges a wand is one d20 and no modifier. */
const FLAT_CHECK = DiceExpressionText.parse('1d20');

/** Rolls the flat check of an overcharge and returns the d20's face. */
export function rollFlatCheck(random: RandomSource): DieFace {
  const outcome = parseDiceExpression(FLAT_CHECK);
  if (!outcome.ok) {
    throw new Error('The flat check expression does not parse');
  }
  const natural = naturalD20(rollDice(outcome.expression, random));
  if (natural === undefined) {
    throw new Error('A d20 roll has a natural die');
  }
  return natural;
}
