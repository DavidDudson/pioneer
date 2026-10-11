import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { StatisticKind } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { CONDITIONAL_STATISTICS, CYCLE, ENTRY_NAMES, FIGHTER_STATISTICS } from '../testing/breakdown-fixtures';
import { BEATEN_STATISTICS } from '../testing/conditional-fixtures';
import { PINNED_STATISTICS } from '../testing/override-fixtures';
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

/** Armor Class pinned by a GM's set override: marked in its summary, with the computed value beside it. */
export const Pinned: StatisticsStory = {
  args: { statistics: PINNED_STATISTICS },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('22'));
    await expect(canvas.getByText('Set by the GM pins it to 22; computed 20.')).toBeVisible();
  },
};

/** A statistic the engine could not derive, marked failed with why. */
export const Failed: StatisticsStory = {
  args: {
    statistics: [...FIGHTER_STATISTICS, { name: 'Perception', kind: StatisticKind.Check, result: CYCLE }],
  },
};

/** Stealth with lines that apply only in some situations: each summarised under the total, worded when it can be. */
export const Conditional: StatisticsStory = {
  args: { statistics: CONDITIONAL_STATISTICS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('+1 circumstance when you are in darkness (Gloom Walker)')).toBeVisible();
    await expect(canvas.getByText('+2 status in some situations (Unseen)')).toBeVisible();
  },
};

/**
 * Athletics with an applied +1 circumstance: a conditional +1 circumstance could never beat it, so only the
 * conditional +2 is summarised; the breakdown names what beats the other.
 */
export const Beaten: StatisticsStory = {
  args: { statistics: BEATEN_STATISTICS },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('+2 circumstance when you Climb (Sure Footing)')).toBeVisible();
    await expect(canvas.queryByText('+1 circumstance when you Climb (Climbing Hooks)')).toBeNull();
    await userEvent.click(canvas.getByText('+10'));
    await expect(canvas.getByText('Applies when you Climb, but Steady Grip already gives as much.')).toBeVisible();
  },
};
