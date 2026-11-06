import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { AttributeModifiers } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { FIGHTER_MODIFIERS } from '../testing/attributes-fixtures';
import { AttributeRolls } from './attribute-rolls.component';

type AttributeRollsStory = StoryObj<AttributeRolls>;

const meta: Meta<AttributeRolls> = {
  title: 'Rules/Attribute rolls',
  component: AttributeRolls,
};
export default meta;

/** While the content the boosts come from loads. */
export const Loading: AttributeRollsStory = {
  args: { modifiers: undefined },
};

/** A new character with nothing picked: every modifier +0. */
export const Unbuilt: AttributeRollsStory = {
  args: { modifiers: AttributeModifiers.none },
};

/** Each modifier is a button that rolls that attribute's flat check. */
export const Fighter: AttributeRollsStory = {
  args: { modifiers: FIGHTER_MODIFIERS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Roll Strength +4' })).toBeVisible();
  },
};
