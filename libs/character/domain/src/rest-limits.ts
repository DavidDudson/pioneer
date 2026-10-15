import type { StatisticInputs } from '@pioneer/rules/engine';
import { Attribute, ConditionTrigger, ContentKind, HitPoints } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import type { RecoveryConditions } from './rest-types';

const HEALING_MIN = 1;

/**
 * What `trigger` does to each condition the registry's packs say it eases, by id; the last pack's entry wins, as in
 * the registry.
 */
export function conditionRecovery(registry: ContentRegistry, trigger: ConditionTrigger): RecoveryConditions {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry) => {
      if (entry.kind !== ContentKind.Condition) {
        return [];
      }
      const effect = entry.data.recovery[trigger];
      return effect === undefined ? [] : [[entry.id, effect] as const];
    }),
  );
}

/** What Rest does to each condition the registry's packs say it eases (Fatigued is removed, Drained lowered), by id. */
export function restRecovery(registry: ContentRegistry): RecoveryConditions {
  return conditionRecovery(registry, ConditionTrigger.Rest);
}

/** What Rest heals: the Constitution modifier, at least 1, times level (Player Core, Resting). */
export function restHealing({ attributes, level }: Pick<StatisticInputs, 'attributes' | 'level'>): HitPoints {
  return HitPoints.parse(Math.max(attributes.get(Attribute.Constitution), HEALING_MIN) * level);
}
