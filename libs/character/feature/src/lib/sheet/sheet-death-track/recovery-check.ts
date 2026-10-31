import type { Dying } from '@pioneer/character/domain';
import { rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import {
  checkOutcome,
  degreeOfSuccess,
  DiceExpressionText,
  NO_FORTUNE,
  parseDiceExpression,
  rollWithFortune,
} from '@pioneer/rules/dice';
import type { DiceExpression, RandomSource, RollResult } from '@pioneer/rules/dice';
import { Dc } from '@pioneer/rules/sdk';
import type { DegreeOfSuccess } from '@pioneer/rules/sdk';

const RECOVERY_DC_BASE = 10;

/** A recovery check is a flat check: one d20 and no modifier. */
const FLAT_CHECK = DiceExpressionText.parse('1d20');

function flatCheck(): DiceExpression {
  const outcome = parseDiceExpression(FLAT_CHECK);
  if (!outcome.ok) {
    throw new Error('The flat check expression does not parse');
  }
  return outcome.expression;
}

/** A recovery check as rolled: its degree of success for the play command, and the roll card that explains it. */
export interface RecoveryRoll {
  readonly degree: DegreeOfSuccess;
  readonly view: RollView;
  /** The roll that counted, for the roll stage. */
  readonly result: RollResult;
}

/** The DC of a recovery check: 10 plus the dying value. */
export function recoveryDc(dying: Dying): Dc {
  return Dc.parse(RECOVERY_DC_BASE + dying);
}

/** Rolls the recovery check for a character at `dying`, as roll `id` on the sheet. */
export function rollRecoveryCheck(dying: Dying, random: RandomSource, id: number): RecoveryRoll {
  const expression = flatCheck();
  const roll = rollWithFortune(expression, NO_FORTUNE, random);
  const kept = roll.rolls.find((entry) => entry.kept);
  if (kept === undefined) {
    throw new Error('A roll keeps one of its rolls');
  }
  const degree = degreeOfSuccess(checkOutcome(kept.result), recoveryDc(dying));
  return {
    degree: degree.degree,
    view: rollView(id, { expression, roll, degree, damage: undefined }),
    result: kept.result,
  };
}
