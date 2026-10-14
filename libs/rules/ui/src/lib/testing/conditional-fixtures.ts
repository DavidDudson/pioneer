import { LineStatusKind } from '@pioneer/rules/engine';
import type { LineStatus, RuleId, StatisticValue } from '@pioneer/rules/engine';
import { SummaryKind } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { ContentText, ModifierType, Predicate, StatisticKind } from '@pioneer/rules/sdk';

import type { NamedStatistic } from '../statistics/statistics.component';
import { CLIMBING_HOOKS, line, ruleId, statistic, STEADY_GRIP, SURE_FOOTING, term } from './breakdown-fixtures';

const STR_ATHLETICS = 4;
const ATHLETICS_PROFICIENCY = 5;
const GRIP_BONUS = 1;
const FOOTING_BONUS = 2;

const WHILE_CLIMBING: PredicateSummary = { kind: SummaryKind.Authored, text: ContentText.parse('you Climb') };

/** Conditional on when you Climb, worded by `summary` if any; beaten by `beatenBy` if that is given. */
export function climbing(summary: PredicateSummary | undefined, beatenBy: RuleId | undefined): LineStatus {
  return { kind: LineStatusKind.Conditional, when: Predicate.parse(['action:climb']), summary, beatenBy };
}

const GRIP = line(STEADY_GRIP, { type: ModifierType.Circumstance, value: GRIP_BONUS });
const HOOKS_STATUS = climbing(WHILE_CLIMBING, ruleId(STEADY_GRIP));
const FOOTING_STATUS = climbing(WHILE_CLIMBING, undefined);

/**
 * Athletics with an applied +1 circumstance from Steady Grip: a conditional +1 circumstance from Climbing Hooks could
 * never beat it, and a conditional +2 circumstance from Sure Footing could.
 */
const CLIMBER_ATHLETICS: StatisticValue = statistic('skill:athletics', {
  base: [term('@attr.str', STR_ATHLETICS), term('@prof.skill.athletics', ATHLETICS_PROFICIENCY)],
  lines: [
    GRIP,
    line(CLIMBING_HOOKS, { type: ModifierType.Circumstance, value: GRIP_BONUS, status: HOOKS_STATUS }),
    line(SURE_FOOTING, { type: ModifierType.Circumstance, value: FOOTING_BONUS, status: FOOTING_STATUS }),
  ],
});

/** A skill with a conditional line an applied one of its type already beats. */
export const BEATEN_STATISTICS: readonly NamedStatistic[] = [
  { name: 'Athletics', kind: StatisticKind.Check, result: CLIMBER_ATHLETICS },
];

/** The line of `CLIMBER_ATHLETICS` whose situation a roll can claim: Sure Footing, when you Climb. */
const FOOTING_LINE = line(SURE_FOOTING, {
  type: ModifierType.Circumstance,
  value: FOOTING_BONUS,
  status: FOOTING_STATUS,
});

/** The rule of the line `CLAIMABLE_STATISTICS` offers to claim. */
export const FOOTING_RULE: RuleId = ruleId(SURE_FOOTING);

/** Athletics with Sure Footing's situation up for claiming, as the sheet offers it, and `claimed` of it claimed. */
export function claimable(claimed: boolean): readonly NamedStatistic[] {
  return [
    {
      name: 'Athletics',
      kind: StatisticKind.Check,
      result: CLIMBER_ATHLETICS,
      situations: { offered: [FOOTING_LINE], claimed: new Set(claimed ? [FOOTING_RULE] : []) },
    },
  ];
}

/** Athletics with Sure Footing's situation up for claiming and not claimed. */
export const CLAIMABLE_STATISTICS: readonly NamedStatistic[] = claimable(false);
