import { InjectionToken } from '@angular/core';
import type { StatisticValue } from '@pioneer/rules/engine';

/** A check on the sheet that can be rolled: what it is called and what the engine derived for it. */
export interface RollableStatistic {
  readonly name: string;
  readonly statistic: StatisticValue;
}

/**
 * What rolling a statistic does. The page that shows statistics knows where rolls go (a roll card, a log), so it
 * provides this; without it the statistics show no roll button.
 */
export interface StatisticRoller {
  readonly roll: (rollable: RollableStatistic) => void;
}

export const STATISTIC_ROLLER = new InjectionToken<StatisticRoller>('STATISTIC_ROLLER');
