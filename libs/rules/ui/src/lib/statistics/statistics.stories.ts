import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Proficiency, StatisticKind } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import {
  CONDITIONAL_STATISTICS,
  CYCLE,
  ENTRY_NAMES,
  FIGHTER_FORTITUDE,
  FIGHTER_STATISTICS,
} from '../testing/breakdown-fixtures';
import { BEATEN_STATISTICS, CLAIMABLE_STATISTICS } from '../testing/conditional-fixtures';
import { PINNED_STATISTICS } from '../testing/override-fixtures';
import { STATISTIC_ROLLER } from './statistic-roller';
import type { StatisticRoller } from './statistic-roller';
import { StatisticsMessage } from './statistics-messages';
import { StatisticsView } from './statistics.component';

type StatisticsStory = StoryObj<StatisticsView>;

/** A roller that rolls and claims nothing, so the rows show their roll and situation toggles. */
const CLAIMING_ROLLER: StatisticRoller = { roll: () => undefined, claim: () => undefined };

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
    await expect(canvas.getByText('Applies when you Climb, but Steady Grip already counts for as much.')).toBeVisible();
  },
};

/** Armor Class's derivation, standing in for a fist's: the story shows the row's name, not its maths. */
const FIST_RESULT = FIGHTER_STATISTICS[0]?.result ?? CYCLE;

/** A Strikes list: a fist, named by its message key since no content names it. */
export const Strikes: StatisticsStory = {
  args: {
    statistics: [{ name: 'fist', nameKey: StatisticsMessage.Fist, kind: StatisticKind.Check, result: FIST_RESULT }],
  },
};

/** No Strikes: the caller names what the empty list lacks. */
export const EmptyStrikes: StatisticsStory = {
  args: { statistics: [], noneKey: StatisticsMessage.NoStrikes },
};

/** Athletics with Sure Footing's situation as a toggle the player flips to count it in the total. */
export const Claimable: StatisticsStory = {
  args: { statistics: CLAIMABLE_STATISTICS },
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: CLAIMING_ROLLER }] })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '+2 circumstance when you Climb (Sure Footing)' })).toBeVisible();
  },
};

/** Skills with their proficiency rank as a letter beside the name: untrained, trained, expert. */
export const Ranked: StatisticsStory = {
  args: {
    statistics: [
      { name: 'Acrobatics', kind: StatisticKind.Check, result: FIGHTER_FORTITUDE, rank: Proficiency.Untrained },
      { name: 'Athletics', kind: StatisticKind.Check, result: FIGHTER_FORTITUDE, rank: Proficiency.Trained },
      { name: 'Stealth', kind: StatisticKind.Check, result: FIGHTER_FORTITUDE, rank: Proficiency.Expert },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Expert')).toBeInTheDocument();
  },
};
