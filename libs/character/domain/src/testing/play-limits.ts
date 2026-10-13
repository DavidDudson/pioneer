import type { HitPoints } from '@pioneer/rules/sdk';

import { NO_COUNTED } from '../counted-resources';
import type { CountedMaxima } from '../counted-resources';
import type { PlayLimits } from '../play-state';
import { NO_RESOURCES } from '../resources';
import type { ResourceMaxima } from '../resources';

/** Limits with `hitPoints` as the maximum and `resources` as the pools' maxima: none, when not given. */
export function within(
  hitPoints: HitPoints,
  resources: ResourceMaxima = NO_RESOURCES,
  counted: CountedMaxima = NO_COUNTED,
): PlayLimits {
  return { hitPoints, resources, counted, valued: new Map() };
}
