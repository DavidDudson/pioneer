import type { HitPoints } from '@pioneer/rules/sdk';

import type { PlayLimits } from '../play-state';
import { NO_RESOURCES } from '../resources';
import type { ResourceMaxima } from '../resources';

/** Limits with `hitPoints` as the maximum and `resources` as the pools' maxima: none, when not given. */
export function within(hitPoints: HitPoints, resources: ResourceMaxima = NO_RESOURCES): PlayLimits {
  return { hitPoints, resources };
}
