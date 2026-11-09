import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId, SpellRank } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import type { SpellRowLine } from './spell-row-line';
import { SpellRowList } from './spell-row-list.component';

type SpellRowListStory = StoryObj<SpellRowList>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

interface Named {
  readonly slug: string;
  readonly name: string;
  readonly source: string;
}

function detail({ slug, name, source }: Named): SpellDetailLine {
  return {
    id: spellId(slug),
    name,
    rank: SpellRank.parse(1),
    cost: { kind: 'actions', cost: 'two', upTo: undefined },
    range: undefined,
    area: undefined,
    targets: undefined,
    defence: undefined,
    duration: undefined,
    effects: [],
    targetValues: [],
    counteract: false,
    tags: [],
    traits: [{ label: 'Divine' }],
    source,
    variants: [],
  };
}

const LINES: readonly SpellRowLine[] = [
  { key: 'daze:cleric', detail: detail({ slug: 'daze', name: 'Daze', source: 'Cleric Spellcasting' }) },
  { key: 'heal:cleric', detail: detail({ slug: 'heal', name: 'Heal', source: 'Cleric Spellcasting' }) },
  { key: 'heal:font', detail: detail({ slug: 'heal', name: 'Heal', source: 'Divine Font' }) },
];

const meta: Meta<SpellRowList> = { title: 'Rules/Spell Row List', component: SpellRowList };
export default meta;

/** One list, alphabetical; a spell known from two sources shows once per source. */
export const TwoSources: SpellRowListStory = {
  args: { lines: LINES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('Heal')).toHaveLength(2);
    await expect(canvas.getByText('Divine Font')).toBeVisible();
  },
};

export const Empty: SpellRowListStory = {
  args: { lines: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/No spells yet/u)).toBeVisible();
  },
};

export const Loading: SpellRowListStory = { args: { lines: undefined } };

const FIREBALL = spellId('fireball');

const WAND: SpellRowLine = {
  key: 'wand:1',
  detail: detail({ slug: 'fireball', name: 'Fireball', source: 'Wand of Fireball (1/1 casts)' }),
  item: {
    kind: 'wand',
    wand: {
      key: 'wand-1',
      name: 'Wand of Fireball',
      id: FIREBALL,
      spell: 'Fireball',
      rank: SpellRank.parse(1),
      broken: false,
      blocked: undefined,
      use: { left: 1, max: 1 },
      castable: true,
      overchargeable: false,
      check: undefined,
    },
  },
};

const STAFF: SpellRowLine = {
  key: 'staff:1:daze',
  detail: detail({ slug: 'daze', name: 'Daze', source: 'Staff of Power (3/4 charges)' }),
  item: {
    kind: 'staff',
    staff: 'staff-1',
    prepared: true,
    spell: {
      key: 'daze',
      id: spellId('daze'),
      name: 'Daze',
      rank: SpellRank.parse(1),
      charges: 1,
      blocked: undefined,
      options: [{ slot: undefined, charges: 1, slotRank: undefined }],
      heightenedTo: undefined,
    },
  },
};

const SCROLL: SpellRowLine = {
  key: 'scroll:1',
  detail: detail({ slug: 'heal', name: 'Heal', source: 'Scroll of Heal' }),
  item: { kind: 'scroll', scroll: { key: 'scroll-1', castable: true } },
};

/** Spells cast from a wand, a staff and a scroll are rows of the list, each with the controls of its item. */
export const WithItems: SpellRowListStory = {
  args: { lines: [...LINES, WAND, STAFF, SCROLL] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Wand of Fireball (1/1 casts)')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Overcharge' })).toBeDisabled();
    await expect(canvas.getAllByRole('button', { name: 'Cast' })[0]).toBeEnabled();
  },
};
