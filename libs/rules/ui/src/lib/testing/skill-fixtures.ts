import { Proficiency, Selector, StatisticKind } from '@pioneer/rules/sdk';

import type { NamedStatistic } from '../statistics/statistics.component';
import { FIGHTER_FORTITUDE } from './breakdown-fixtures';

function skill(name: string, selector: string, rank: Proficiency): NamedStatistic {
  return {
    name,
    kind: StatisticKind.Check,
    result: { ...FIGHTER_FORTITUDE, selector: Selector.parse(selector) },
    rank,
  };
}

/** Three skills and a Lore, as the sheet lists them. */
export const SKILL_STATISTICS: readonly NamedStatistic[] = [
  skill('Acrobatics', 'skill:acrobatics', Proficiency.Trained),
  skill('Athletics', 'skill:athletics', Proficiency.Expert),
  skill('Stealth', 'skill:stealth', Proficiency.Untrained),
  skill('Sailing Lore', 'skill:lore:sailing', Proficiency.Trained),
];
