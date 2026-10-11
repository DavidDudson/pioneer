import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { StatisticKind } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { CYCLE, ENTRY_NAMES, FIGHTER_STATISTICS } from '../testing/breakdown-fixtures';
import { StatisticsView } from './statistics.component';

type StatisticsStory = StoryObj<StatisticsView>;

const meta: Meta<StatisticsView> = {
  title: 'Rules/Statistics',
  component: StatisticsView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: placeholder rows. */
export const Loading: StatisticsStory = {
  args: { statistics: undefined },
};

/** No statistics defined: the list says so. */
export const Empty: StatisticsStory = {
  args: { statistics: [] },
};

/** A fighter's AC and saves; each total expands in place to its breakdown. */
export const Fighter: StatisticsStory = {
  args: { statistics: FIGHTER_STATISTICS },
};

/** Armor Class opened: its breakdown shows under its total. */
export const Expanded: StatisticsStory = {
  args: { statistics: FIGHTER_STATISTICS },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('20'));
    await expect(canvas.getByText('Breastplate counts instead.')).toBeVisible();
  },
};

/** A statistic the engine could not derive, marked failed with why. */
export const Failed: StatisticsStory = {
  args: {
    statistics: [...FIGHTER_STATISTICS, { name: 'Perception', kind: StatisticKind.Check, result: CYCLE }],
  },
};
