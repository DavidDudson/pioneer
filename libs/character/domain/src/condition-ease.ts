import { ConditionEffect, ConditionValue } from '@pioneer/rules/sdk';
import type { ConditionChange } from '@pioneer/rules/sdk';

import type { ActiveCondition } from './conditions';

const LOWER_ONE = 1;
const LAST_VALUE = ConditionValue.parse(1);

/** What a `ConditionChange` leaves of a condition: nothing, or the condition at a lower value. */
export type EasedCondition = { readonly ended: true } | { readonly ended: false; readonly value: ConditionValue };

/**
 * `condition` after `change`: gone if the change removes it or the value is spent, else lowered by `by` (1 when the
 * change gives none). A condition without a value counts as 1.
 */
export function easeCondition(condition: ActiveCondition, change: ConditionChange): EasedCondition {
  const value = condition.value ?? LAST_VALUE;
  const by = change.by ?? LOWER_ONE;
  if (change.effect === ConditionEffect.Remove || value <= by) {
    return { ended: true };
  }
  return { ended: false, value: ConditionValue.parse(value - by) };
}
