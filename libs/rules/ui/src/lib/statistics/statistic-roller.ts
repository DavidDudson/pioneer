import { InjectionToken } from '@angular/core';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import type { Selector } from '@pioneer/rules/sdk';

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
  /** Claims the situation of a conditional line for the next roll of a statistic, or lets it go; unset where it cannot be. */
  readonly claim?: (selector: Selector, rule: RuleId, on: boolean) => void;
}

export const STATISTIC_ROLLER = new InjectionToken<StatisticRoller>('STATISTIC_ROLLER');
