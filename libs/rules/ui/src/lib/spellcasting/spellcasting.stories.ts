import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { MULTICLASS_SPELLCASTING, WIZARD_SPELLCASTING } from '../testing/spellcasting-fixtures';
import { SpellcastingView } from './spellcasting.component';

type SpellcastingStory = StoryObj<SpellcastingView>;

const meta: Meta<SpellcastingView> = {
  title: 'Rules/Spellcasting',
  component: SpellcastingView,
};
export default meta;

/** While the character's entries load. */
export const Loading: SpellcastingStory = {
  args: { entries: undefined },
};

/** A character who casts no spells. */
export const Empty: SpellcastingStory = {
  args: { entries: [] },
};

/** A 1st-level wizard: one arcane prepared entry. */
export const Wizard: SpellcastingStory = {
  args: { entries: WIZARD_SPELLCASTING },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Arcane')).toBeVisible();
    await expect(canvas.getByText('from Wizard Spellcasting')).toBeVisible();
  },
};

/** A wizard with a bard dedication: two entries, each with its own spell attack and DC. */
export const Multiclass: SpellcastingStory = {
  args: { entries: MULTICLASS_SPELLCASTING },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Spontaneous')).toBeVisible();
    await expect(canvas.getByText('from Bard Dedication')).toBeVisible();
  },
};
