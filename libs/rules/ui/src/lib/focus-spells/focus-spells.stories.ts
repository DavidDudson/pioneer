import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, FocusPoints, PackId, SpellRank } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { FocusSpellsView } from './focus-spells.component';

type FocusSpellsStory = StoryObj<FocusSpellsView>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const meta: Meta<FocusSpellsView> = {
  title: 'Rules/Focus Spells',
  component: FocusSpellsView,
};
export default meta;

/** A 7th-level bard with two compositions and the Courageous Anthem cantrip. */
export const Bard: FocusSpellsStory = {
  args: {
    focus: {
      rank: SpellRank.parse(4),
      pool: FocusPoints.parse(2),
      entries: [
        {
          key: 'bard-focus',
          tradition: 'occult',
          spells: [
            {
              key: 'counter-performance',
              id: spellId('counter-performance'),
              name: 'Counter Performance',
              cantrip: false,
            },
            { key: 'courageous-anthem', id: spellId('courageous-anthem'), name: 'Courageous Anthem', cantrip: true },
            {
              key: 'lingering-composition',
              id: spellId('lingering-composition'),
              name: 'Lingering Composition',
              cantrip: false,
            },
          ],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Focus pool: 2 Focus Points')).toBeVisible();
    await expect(canvas.getByText('Cast at 4th rank, cantrips too')).toBeVisible();
    await expect(canvas.getByText('Cantrip')).toBeVisible();
  },
};

/** While the spells load. */
export const Loading: FocusSpellsStory = {
  args: { focus: undefined },
};

/** A cleric who hasn't picked a domain yet. */
export const NoneYet: FocusSpellsStory = {
  args: {
    focus: {
      rank: SpellRank.parse(1),
      pool: FocusPoints.parse(0),
      entries: [{ key: 'cleric-focus', tradition: 'divine', spells: [] }],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('No focus spells yet. A choice that grants them may still be open.'),
    ).toBeVisible();
  },
};
