import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { FIGHTER_VITALS, UNARMORED_VITALS } from '../testing/vitals-fixtures';
import { VitalsView } from './vitals.component';

type VitalsStory = StoryObj<VitalsView>;

const meta: Meta<VitalsView> = {
  title: 'Rules/Vitals',
  component: VitalsView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: a placeholder tile per vital. */
export const Loading: VitalsStory = { args: { vitals: undefined } };

/** A fighter in a breastplate: AC with what sets it, saves with their ranks. */
export const Fighter: VitalsStory = { args: { vitals: FIGHTER_VITALS } };

/** Out of armour, AC says so. */
export const Unarmored: VitalsStory = { args: { vitals: UNARMORED_VITALS } };

/** Armor Class opened: its breakdown shows in its tile. */
export const Expanded: VitalsStory = {
  args: { vitals: FIGHTER_VITALS },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('20'));
    await expect(canvas.getByText('Breastplate counts instead.')).toBeVisible();
  },
};
