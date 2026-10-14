import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Dc } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import {
  ADJUSTED_DEGREE,
  CANCELLED_CHECK,
  CRITICAL_FAILURE,
  CRITICAL_SUCCESS,
  FAILURE,
  FORTUNE_CHECK,
  MISFORTUNE_CHECK,
  PLAIN_CHECK,
  SUCCESS,
  TOGGLE_REASONS,
  WITH_TOGGLES,
} from '../testing/roll-fixtures';
import { RollCard } from './roll-card.component';

type RollCardStory = StoryObj<RollCard>;

const meta: Meta<RollCard> = {
  title: 'Play/Roll card',
  component: RollCard,
};
export default meta;

/** A d20 and a +7 modifier, rolled with no DC: the total and the dice, no degree. */
export const Plain: RollCardStory = {
  args: { roll: PLAIN_CHECK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Total 19')).toBeVisible();
    await expect(canvas.queryByText('Success')).toBeNull();
  },
};

/** Fortune: both d20s show, the higher marked kept. */
export const Fortune: RollCardStory = {
  args: { roll: FORTUNE_CHECK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Roll 2: 21, kept')).toBeVisible();
    await expect(canvas.getByText('Roll 1: 12, discarded')).toBeVisible();
  },
};

/** Misfortune: both d20s show, the lower marked kept. */
export const Misfortune: RollCardStory = {
  args: { roll: MISFORTUNE_CHECK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Roll 2: 12, kept')).toBeVisible();
  },
};

/** Fortune and misfortune together: the card says they cancelled and shows the one roll. */
export const Cancelled: RollCardStory = {
  args: { roll: CANCELLED_CHECK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Fortune and misfortune cancel out: rolled once.')).toBeVisible();
  },
};

/** Against DC 15, a 19 is a success. */
export const Success: RollCardStory = {
  args: { roll: SUCCESS, dc: Dc.parse(15), dcEditable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [degree] = canvas.getAllByText('Success');
    await expect(degree).toBeVisible();
  },
};

export const CriticalSuccess: RollCardStory = {
  args: { roll: CRITICAL_SUCCESS, dc: Dc.parse(15), dcEditable: true },
};

export const Failure: RollCardStory = {
  args: { roll: FAILURE, dc: Dc.parse(15), dcEditable: true },
};

export const CriticalFailure: RollCardStory = {
  args: { roll: CRITICAL_FAILURE, dc: Dc.parse(25), dcEditable: true },
};

/** An effect moved the degree: the card says from which to which, and from what. */
export const AdjustedDegree: RollCardStory = {
  args: { roll: ADJUSTED_DEGREE, dc: Dc.parse(15), dcEditable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Success to Critical success, from Juggernaut')).toBeVisible();
  },
};

/** The DC box, empty: typing a DC is how a roll gets a degree. */
export const WithoutDc: RollCardStory = {
  args: { roll: PLAIN_CHECK, dcEditable: true },
};

/** A roll made with toggles on: the card names them under the total. */
export const RolledWithToggles: RollCardStory = {
  args: { roll: WITH_TOGGLES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Rolled with')).toBeVisible();
    await Promise.all(TOGGLE_REASONS.map(async (reason) => expect(canvas.getByText(reason)).toBeVisible()));
  },
};
