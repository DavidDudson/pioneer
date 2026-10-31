import { DiceExpressionText, naturalD20, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { DieFace, RandomSource, RollResult } from '@pioneer/rules/dice';

/** The flat check that overcharges a wand is one d20 and no modifier. */
const FLAT_CHECK = DiceExpressionText.parse('1d20');

/** A flat check as rolled: the d20's face for the overcharge, and the roll the stage plays. */
export interface FlatCheckRoll {
  readonly natural: DieFace;
  readonly result: RollResult;
}

/** Rolls the flat check of an overcharge. */
export function rollFlatCheck(random: RandomSource): FlatCheckRoll {
  const outcome = parseDiceExpression(FLAT_CHECK);
  if (!outcome.ok) {
    throw new Error('The flat check expression does not parse');
  }
  const result = rollDice(outcome.expression, random);
  const natural = naturalD20(result);
  if (natural === undefined) {
    throw new Error('A d20 roll has a natural die');
  }
  return { natural, result };
}
