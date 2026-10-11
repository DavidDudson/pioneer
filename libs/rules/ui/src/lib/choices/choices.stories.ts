import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ELF_CHOICES } from '../testing/choices-fixtures';
import { ChoicesView } from './choices.component';

type ChoicesStory = StoryObj<ChoicesView>;

const meta: Meta<ChoicesView> = {
  title: 'Rules/Choices',
  component: ChoicesView,
};
export default meta;

/** While the character's slots load. */
export const Loading: ChoicesStory = {
  args: { lines: undefined },
};

/** A character with no choices. */
export const Empty: ChoicesStory = {
  args: { lines: [] },
};

/** Every state: chosen, open, planned, invalid (now and at a planned level) and kept. */
export const Elf: ChoicesStory = {
  args: { lines: ELF_CHOICES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Needs a new choice at level 5')).toBeVisible();
    await expect(canvas.getByText('Kept, not on the character')).toBeVisible();
  },
};
