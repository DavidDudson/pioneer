import { InjectionToken } from '@angular/core';
import type { Selector } from '@pioneer/rules/sdk';

/** What a statistic is called: its definition's name, by selector; undefined when no definition names it. */
export type StatisticNamer = (selector: Selector) => string | undefined;

/**
 * Where the breakdown gets the name of a statistic a reference reads (`@prof.ac`, `@stat.perception`). The page that
 * has the content registry provides it; without one, a reference to a statistic shows as written.
 */
export const STATISTIC_NAMES = new InjectionToken<StatisticNamer>('STATISTIC_NAMES', {
  factory: (): StatisticNamer => (): undefined => undefined,
});
