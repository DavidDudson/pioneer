import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { RollEffectStatusKind } from '@pioneer/rules/engine';
import type { RollEffects, RollEffectStatus, StatisticValue } from '@pioneer/rules/engine';
import { DegreeChange, ModifierType, Predicate, RollKept, StatisticKind } from '@pioneer/rules/sdk';

import {
  ENTRY_NAMES,
  IN_DARKNESS,
  line,
  ruleId,
  statistic,
  STEADY_GRIP,
  SURE_FOOTING,
  term,
} from '../../testing/breakdown-fixtures';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticRoll } from './statistic-roll.component';

type RollStory = StoryObj<StatisticRoll>;

const APPLIED: RollEffectStatus = { kind: RollEffectStatusKind.Applied };
const WHEN_DARK: RollEffectStatus = {
  kind: RollEffectStatusKind.Conditional,
  when: Predicate.parse(['lighting:darkness']),
  summary: undefined,
};

/** A check of +5 base with the given lines and roll effects. */
function check(lines: StatisticValue['lines'], effects: Partial<RollEffects> = {}): StatisticValue {
  const base = statistic('skill:acrobatics', { base: [term('5', 5)], lines });
  return { ...base, rollEffects: { rollTwice: [], degreeAdjustments: [], ...effects } };
}

const BONUS = line(STEADY_GRIP, { type: ModifierType.Status, value: 2 });
const PENALTY = line(SURE_FOOTING, { type: ModifierType.Circumstance, value: -2 });

const meta: Meta<StatisticRoll> = {
  title: 'Rules/Statistic roll',
  component: StatisticRoll,
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: { roll: () => undefined } }] })],
  args: { name: 'Acrobatics', kind: StatisticKind.Check, entryNames: ENTRY_NAMES, statistic: check([]) },
};
export default meta;

/** Nothing applies beyond the base: neutral. */
export const Neutral: RollStory = {};

/** A net bonus from the applied lines: green text. */
export const Bonus: RollStory = { args: { statistic: check([BONUS]) } };

/** A net penalty from the applied lines: red text. */
export const Penalty: RollStory = { args: { statistic: check([PENALTY]) } };

/** A line that applies only in some situations: an asterisk after the modifier. */
export const Conditional: RollStory = {
  args: { statistic: check([line(STEADY_GRIP, { type: ModifierType.Status, value: 2, status: IN_DARKNESS })]) },
};

/** An applied roll-twice keeping the higher: a fortune background; the popover words it. */
export const Fortune: RollStory = {
  args: {
    statistic: check([], {
      rollTwice: [
        { id: ruleId(STEADY_GRIP, 1), label: { entry: STEADY_GRIP }, keep: RollKept.Higher, status: APPLIED },
      ],
    }),
  },
};

/** An applied roll-twice keeping the lower: a misfortune background. */
export const Misfortune: RollStory = {
  args: {
    statistic: check([], {
      rollTwice: [{ id: ruleId(STEADY_GRIP, 1), label: { entry: STEADY_GRIP }, keep: RollKept.Lower, status: APPLIED }],
    }),
  },
};

/** An applied degree adjustment: a blue border. */
export const DegreeShifted: RollStory = {
  args: {
    statistic: check([], {
      degreeAdjustments: [
        {
          id: ruleId(SURE_FOOTING, 1),
          label: { entry: SURE_FOOTING },
          adjustment: { success: DegreeChange.OneDegreeBetter },
          status: APPLIED,
        },
      ],
    }),
  },
};

/** Everything together: a bonus, fortune, a shifted degree, and a conditional degree shift that marks it. */
export const AllCues: RollStory = {
  args: {
    statistic: check([BONUS], {
      rollTwice: [
        { id: ruleId(STEADY_GRIP, 1), label: { entry: STEADY_GRIP }, keep: RollKept.Higher, status: APPLIED },
      ],
      degreeAdjustments: [
        {
          id: ruleId(SURE_FOOTING, 1),
          label: { entry: SURE_FOOTING },
          adjustment: { success: DegreeChange.OneDegreeBetter },
          status: APPLIED,
        },
        {
          id: ruleId(SURE_FOOTING, 2),
          label: { entry: SURE_FOOTING },
          adjustment: { criticalFailure: DegreeChange.ToFailure },
          status: WHEN_DARK,
        },
      ],
    }),
  },
};
