import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { FIGHTER_VITALS, UNARMORED_VITALS } from '../testing/vitals-fixtures';
import { ArmorClass } from './armor-class.component';

type ArmorClassStory = StoryObj<ArmorClass>;

const meta: Meta<ArmorClass> = {
  title: 'Rules/Armor Class',
  component: ArmorClass,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: nothing shows. */
export const Loading: ArmorClassStory = { args: { vital: undefined } };

/** A fighter in a breastplate: the total large, the armour in the rank badge's note. */
export const Armored: ArmorClassStory = { args: { vital: FIGHTER_VITALS[0] } };

/** Out of armour, the badge's note says so. */
export const Unarmored: ArmorClassStory = { args: { vital: UNARMORED_VITALS[0] } };

/** The total pressed: its breakdown shows. */
export const Expanded: ArmorClassStory = {
  args: { vital: FIGHTER_VITALS[0] },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('20'));
    // The card opens in the overlay container on the body, not in the canvas.
    const overlay = within(canvasElement.ownerDocument.body);
    await expect(await overlay.findByText('Breastplate counts instead.')).toBeVisible();
  },
};
