import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { AttributeModifiers } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { FIGHTER_MODIFIERS, OPEN_BOOSTS } from '../testing/attributes-fixtures';
import { AttributesView } from './attributes.component';

type AttributesStory = StoryObj<AttributesView>;

const meta: Meta<AttributesView> = {
  title: 'Rules/Attributes',
  component: AttributesView,
};
export default meta;

/** While the content the boosts come from loads. */
export const Loading: AttributesStory = {
  args: { modifiers: undefined },
};

/** A new character with nothing picked: every modifier +0. */
export const Unbuilt: AttributesStory = {
  args: { modifiers: AttributeModifiers.none },
};

/** Every boost placed. */
export const Fighter: AttributesStory = {
  args: { modifiers: FIGHTER_MODIFIERS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('+4')).toBeVisible();
  },
};

/** Boosts still to place are listed under the modifiers. */
export const OpenBoosts: AttributesStory = {
  args: { modifiers: FIGHTER_MODIFIERS, open: OPEN_BOOSTS },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Level 1 boost')).toBeVisible();
  },
};
