import type { StatisticInputs } from '@pioneer/rules/engine';
import { Attribute, ConditionTrigger, ContentKind, HitPoints } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import type { RecoveryConditions } from './rest-types';

const HEALING_MIN = 1;

/**
 * What Rest does to each condition the registry's packs say it eases (Fatigued is removed, Drained lowered), by id; the
 * last pack's entry wins, as in the registry.
 */
export function restRecovery(registry: ContentRegistry): RecoveryConditions {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry) => {
      if (entry.kind !== ContentKind.Condition) {
        return [];
      }
      const effect = entry.data.recovery[ConditionTrigger.Rest];
      return effect === undefined ? [] : [[entry.id, effect] as const];
    }),
  );
}

/** What Rest heals: the Constitution modifier, at least 1, times level (Player Core, Resting). */
export function restHealing({ attributes, level }: Pick<StatisticInputs, 'attributes' | 'level'>): HitPoints {
  return HitPoints.parse(Math.max(attributes.get(Attribute.Constitution), HEALING_MIN) * level);
}
