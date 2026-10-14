import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { RollToggles } from './roll-toggles.component';

type RollTogglesStory = StoryObj<RollToggles>;

const meta: Meta<RollToggles> = {
  title: 'Play/Roll toggles',
  component: RollToggles,
};
export default meta;

const UNDEAD = { id: 'bane', text: '+1 circumstance when the target is undead (Hunter’s cloak)', on: false };
const FOCUS = { id: 'focus', text: 'Hunter’s focus', on: true };

/** A situation for this roll and a toggle the character keeps, each in its own group. */
export const Both: RollTogglesStory = {
  args: { perRoll: [UNDEAD], remembered: [FOCUS] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Counts for this roll only')).toBeVisible();
    await expect(canvas.getByRole('button', { name: UNDEAD.text })).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByRole('button', { name: FOCUS.text })).toHaveAttribute('aria-pressed', 'true');
  },
};

/** Only situations for this roll. */
export const PerRollOnly: RollTogglesStory = {
  args: { perRoll: [UNDEAD] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: UNDEAD.text }));
    await expect(canvas.queryByText('Kept between rolls')).toBeNull();
  },
};
