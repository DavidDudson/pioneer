import { applyDamage, NO_DEFENCES } from '@pioneer/rules/dice';
import type { DamageApplication, FortunedRoll } from '@pioneer/rules/dice';
import type { CheckNode, Dc, DegreeOfSuccess } from '@pioneer/rules/sdk';

import { rolledDegree } from './sheet-roll-degree';

/** The degree a basic save reached, to scale the damage rolled next; unset for any other check, or without a DC. */
export function basicSaveDegree(
  roll: FortunedRoll,
  dc: Dc | undefined,
  check?: CheckNode,
): DegreeOfSuccess | undefined {
  return check?.basic === true ? rolledDegree(roll, dc)?.degree : undefined;
}

/** `roll` as damage after a basic save of `save`; unset when no save came before it, or nothing was kept. */
export function savedDamage(roll: FortunedRoll, save: DegreeOfSuccess | undefined): DamageApplication | undefined {
  const kept = roll.rolls.find((entry) => entry.kept);
  return save === undefined || kept === undefined
    ? undefined
    : applyDamage(kept.result, NO_DEFENCES, { critical: false, save });
}
