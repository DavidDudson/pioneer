import { checkOutcome, degreeOfSuccess } from '@pioneer/rules/dice';
import type { DegreeResult, FortunedRoll } from '@pioneer/rules/dice';
import type { Dc } from '@pioneer/rules/sdk';

/** The degree of success the kept roll of a check reaches against `dc`; unset without a DC or a kept roll. */
export function rolledDegree(roll: FortunedRoll, dc: Dc | undefined): DegreeResult | undefined {
  const kept = roll.rolls.find((entry) => entry.kept);
  return dc === undefined || kept === undefined ? undefined : degreeOfSuccess(checkOutcome(kept.result), dc);
}
