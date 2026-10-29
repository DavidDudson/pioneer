import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { SlotKey } from '@pioneer/rules/sdk';
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

/** Chosen choices offer a toggle that keeps them when the rest are re-rolled; the ancestry is kept. */
export const Lockable: ChoicesStory = {
  args: { lines: ELF_CHOICES, lockable: true, locked: new Set([SlotKey.parse('ancestry')]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Keep Ancestry when re-rolling' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Keep Level 1 boost when re-rolling' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};
