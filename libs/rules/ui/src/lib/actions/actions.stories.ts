import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ActionMode } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { StatisticRoller } from '../statistics/statistic-roller';
import { GRABBED_ACTIONS, PRONE_ACTIONS, SHIELD_RAISED_ACTIONS, STANDING_ACTIONS } from '../testing/action-fixtures';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

type ActionsStory = StoryObj<ActionsView>;

/** A roller that rolls nothing, so the rows that roll show their button. */
const ROLLER: StatisticRoller = { roll: () => undefined };

const meta: Meta<ActionsView> = {
  title: 'Rules/Actions',
  component: ActionsView,
  args: { mode: ActionMode.Encounter, view: ActionsViewKind.Now },
  decorators: [applicationConfig({ providers: [{ provide: STATISTIC_ROLLER, useValue: ROLLER }] })],
};
export default meta;

/** While the engine's inputs load: placeholder rows. */
export const Loading: ActionsStory = {
  args: { lines: undefined },
};

/** Nothing to do in this mode right now. */
export const Empty: ActionsStory = {
  args: { lines: [] },
};

/** Standing in an encounter: the usable actions by cost, Escape and Grapple with a roll button. */
export const Now: ActionsStory = {
  args: { lines: STANDING_ACTIONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '1 action' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Roll Escape' })).toBeVisible();
    await expect(canvas.queryByText('Pick a Lock')).toBeNull();
  },
};

/** Prone: Stand and Crawl come first. */
export const Prone: ActionsStory = {
  args: { lines: PRONE_ACTIONS },
};

/** Grabbed: Escape comes first. */
export const Grabbed: ActionsStory = {
  args: { lines: GRABBED_ACTIONS },
};

/** With a shield raised: Shield Block is enabled. */
export const ShieldRaised: ActionsStory = {
  args: { lines: SHIELD_RAISED_ACTIONS },
};

/** The Downtime tab: actions with no cost. */
export const Downtime: ActionsStory = {
  args: { lines: STANDING_ACTIONS, mode: ActionMode.Downtime },
};

/** Every action, with its status and why an unusable one is. */
export const All: ActionsStory = {
  args: { lines: STANDING_ACTIONS, view: ActionsViewKind.All },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Needs trained proficiency in thievery.')).toBeVisible();
  },
};

/** The All view narrowed to one trait. */
export const Filtered: ActionsStory = {
  args: { lines: STANDING_ACTIONS, view: ActionsViewKind.All },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'attack' }));
    await expect(canvas.queryByText('Stride')).toBeNull();
    await expect(canvas.getByText('Grapple')).toBeVisible();
  },
};
