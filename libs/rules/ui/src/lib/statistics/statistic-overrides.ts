import { InjectionToken } from '@angular/core';
import type { Selector } from '@pioneer/rules/sdk';

import type { StatisticLink } from '../entry-preview/entry-preview';

/** How a hand-made override changes a statistic: it adds a typed modifier, or pins the total. */
export const StatisticOverrideMode = { Adjust: 'adjust', Set: 'set' } as const;
export type StatisticOverrideMode = (typeof StatisticOverrideMode)[keyof typeof StatisticOverrideMode];

/**
 * Where a statistic's override form opens. The page that lets the player override statistics knows where the form
 * lives (a drawer beside the sheet), so it provides this; without it the rows show no Adjust or Set.
 */
export interface StatisticOverrides {
  readonly link: (selector: Selector, mode: StatisticOverrideMode) => StatisticLink;
}

export const STATISTIC_OVERRIDES = new InjectionToken<StatisticOverrides>('STATISTIC_OVERRIDES');
