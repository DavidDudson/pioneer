import type { HitPoints } from '@pioneer/rules/sdk';

import { NO_COUNTED } from '../counted-resources';
import type { CountedMaxima } from '../counted-resources';
import type { PlayLimits } from '../play-state';
import { NO_RESOURCES } from '../resources';
import type { ResourceMaxima } from '../resources';
import type { RecoveryConditions } from '../rest-types';
import { NO_SHIELDS } from '../shield-commands';
import type { SpendLimits } from '../spend-commands';
import { SpendTime } from '../spend-log';
import { NO_STAFF } from '../staff-limits';

const NO_RECOVERY: RecoveryConditions = new Map();

/** A fixed time for a spend. */
export const TEST_SPEND: SpendLimits = {
  now: SpendTime.parse('2026-10-16T12:00:00.000Z'),
};

/** Limits with `hitPoints` as the maximum and `resources` as the pools' maxima: none, when not given. */
export function within(
  hitPoints: HitPoints,
  resources: ResourceMaxima = NO_RESOURCES,
  counted: CountedMaxima = NO_COUNTED,
): PlayLimits {
  return {
    hitPoints,
    healing: hitPoints,
    recovery: NO_RECOVERY,
    resources,
    counted,
    staff: NO_STAFF,
    valued: new Map(),
    effects: new Map(),
    spend: TEST_SPEND,
    shields: NO_SHIELDS,
  };
}
