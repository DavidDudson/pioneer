import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ModifierType } from '@pioneer/rules/sdk';

import {
  BREASTPLATE,
  ENTRY_NAMES,
  FIGHTER_AC,
  FIGHTER_WILL,
  IN_DARKNESS,
  line,
  statistic,
  term,
} from '../testing/breakdown-fixtures';
import { PINNED_AC } from '../testing/override-fixtures';
import { BreakdownView } from './breakdown.component';

type BreakdownStory = StoryObj<BreakdownView>;

const meta: Meta<BreakdownView> = {
  title: 'Rules/Breakdown',
  component: BreakdownView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** Every line status: applied, conditional, suppressed by a better item bonus, inactive and failed. */
export const ArmorClass: BreakdownStory = {
  args: { statistic: FIGHTER_AC },
};

/** Only a base: the terms that give it, and no modifiers. */
export const BaseOnly: BreakdownStory = {
  args: { statistic: FIGHTER_WILL },
};

/** A condition generated from the predicate, rather than authored. */
export const Conditional: BreakdownStory = {
  args: {
    statistic: statistic('perception', {
      base: [term('@attr.wis', 1), term('@prof.perception', 5)],
      lines: [line(BREASTPLATE, { type: ModifierType.Circumstance, value: 2, status: IN_DARKNESS })],
    }),
  },
};

/** A GM's set override pins AC to 22, replacing an earlier one; a form's `Change` is not in effect. */
export const Pinned: BreakdownStory = {
  args: { statistic: PINNED_AC },
};

/** With no entry names, lines show their entry ids. */
export const WithoutNames: BreakdownStory = {
  args: { statistic: FIGHTER_AC, entryNames: new Map() },
};
