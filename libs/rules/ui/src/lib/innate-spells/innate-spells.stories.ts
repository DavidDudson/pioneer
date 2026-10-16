import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId, SpellRank } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { InnateSpellsView } from './innate-spells.component';

type InnateSpellsStory = StoryObj<InnateSpellsView>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const meta: Meta<InnateSpellsView> = {
  title: 'Rules/Innate Spells',
  component: InnateSpellsView,
};
export default meta;

/** A character with Grown of Oak and Fey Influence. */
export const TwoEntries: InnateSpellsStory = {
  args: {
    innate: {
      entries: [
        {
          key: 'fey-influence',
          tradition: 'primal',
          spells: [
            {
              key: 'ill-omen',
              id: spellId('ill-omen'),
              name: 'Ill Omen',
              cantrip: false,
              detail: undefined,
              rank: SpellRank.parse(1),
            },
          ],
        },
        {
          key: 'grown-of-oak',
          tradition: 'primal',
          spells: [
            {
              key: 'oaken-resilience',
              id: spellId('oaken-resilience'),
              name: 'Oaken Resilience',
              cantrip: false,
              detail: undefined,
              rank: SpellRank.parse(2),
            },
          ],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ill Omen')).toBeVisible();
    await expect(canvas.getByText('Cast at 2nd rank')).toBeVisible();
  },
};

/** While the spells load. */
export const Loading: InnateSpellsStory = {
  args: { innate: undefined },
};

/** An entry whose choice is still open. */
export const NoneYet: InnateSpellsStory = {
  args: { innate: { entries: [{ key: 'fey-influence', tradition: 'primal', spells: [] }] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('No innate spells yet. A choice that grants them may still be open.'),
    ).toBeVisible();
  },
};
