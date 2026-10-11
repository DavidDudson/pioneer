import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { SpellAccessListView } from './spell-access-list.component';

type SpellAccessStory = StoryObj<SpellAccessListView>;

const meta: Meta<SpellAccessListView> = {
  title: 'Rules/Spell Access',
  component: SpellAccessListView,
};
export default meta;

/** While the spells load. */
export const Loading: SpellAccessStory = {
  args: { lines: undefined },
};

/** No uncommon, rare or unique spells yet. */
export const Empty: SpellAccessStory = {
  args: { lines: [] },
};

/** A wizard who found Veil of Privacy, and a spell from a pack no longer loaded. */
export const Granted: SpellAccessStory = {
  args: {
    lines: [
      { spell: 'veil-of-privacy', name: 'Veil of Privacy' },
      { spell: 'gone', name: undefined },
    ],
    remove: async () => undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Remove Veil of Privacy' })).toBeVisible();
    await expect(canvas.getByText('Unknown spell')).toBeVisible();
  },
};
