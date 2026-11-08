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
