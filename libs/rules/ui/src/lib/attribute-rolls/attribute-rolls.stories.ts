import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { FIGHTER_CHECKS } from '../testing/attributes-fixtures';
import { AttributeRolls } from './attribute-rolls.component';

type AttributeRollsStory = StoryObj<AttributeRolls>;

const meta: Meta<AttributeRolls> = {
  title: 'Rules/Attribute rolls',
  component: AttributeRolls,
};
export default meta;

/** While the statistics the checks come from load. */
export const Loading: AttributeRollsStory = {
  args: { statistics: undefined },
};

/** Each modifier is a roll button that rolls that attribute's check. */
export const Fighter: AttributeRollsStory = {
  args: { statistics: FIGHTER_CHECKS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Roll Strength +4' })).toBeVisible();
  },
};
