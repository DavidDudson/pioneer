import type { DamageAdjustment, DamageTarget } from '@pioneer/rules/sdk';

import { DefenceStatusKind } from './defences';
import type { AdjustmentLine, Defences, ImmunityLine } from './defences';
import type { RuleId } from './rule-in-play';

const NO_TOGGLES: ReadonlySet<RuleId> = new Set();

/**
 * Whether a line bears on damage now: applied or superseded, or conditional and toggled on. A superseded line still
 * goes to the pipeline, which picks the highest per damage instance and may skip one whose exception the damage has.
 */
function counts({ id, status }: ImmunityLine | AdjustmentLine, on: ReadonlySet<RuleId>): boolean {
  if (status.kind === DefenceStatusKind.Applied || status.kind === DefenceStatusKind.Superseded) {
    return true;
  }
  return status.kind === DefenceStatusKind.Conditional && on.has(id);
}

function adjustments(lines: readonly AdjustmentLine[], on: ReadonlySet<RuleId>): readonly DamageAdjustment[] {
  return lines.flatMap((line) => {
    if (line.value === undefined || !counts(line, on)) {
      return [];
    }
    const exceptions = line.exceptions.length === 0 ? {} : { exceptions: line.exceptions };
    return [{ type: line.type, value: line.value, ...exceptions }];
  });
}

/**
 * The defences as the damage pipeline takes them (`applyDamage` in `@pioneer/rules/dice`): the applied and superseded
 * ones, and the conditional ones whose rules are toggled `on`. The pipeline picks the highest weakness and resistance
 * per damage instance itself, skipping one whose exception the instance has.
 */
export function damageTargetOf(defences: Defences, on: ReadonlySet<RuleId> = NO_TOGGLES): DamageTarget {
  return {
    immunities: [...new Set(defences.immunities.filter((line) => counts(line, on)).map(({ type }) => type))],
    weaknesses: adjustments(defences.weaknesses, on),
    resistances: adjustments(defences.resistances, on),
  };
}
