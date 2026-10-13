import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { SpellAccessListView } from './spell-access-list.component';

type SpellAccessStory = StoryObj<SpellAccessListView>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

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
      { spell: spellId('veil-of-privacy'), name: 'Veil of Privacy' },
      { spell: spellId('gone'), name: undefined },
    ],
    remove: async () => undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Remove Veil of Privacy' })).toBeVisible();
    await expect(canvas.getByText('Unknown spell')).toBeVisible();
  },
};
