import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId, SpellRank } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import type { SpellDetailLine } from './spell-detail-line';
import { SpellDetails } from './spell-details.component';
import { SpellListMessage } from './spell-list-messages';

type SpellDetailsStory = StoryObj<SpellDetails>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const meta: Meta<SpellDetails> = {
  title: 'Rules/Spell Details',
  component: SpellDetails,
};
export default meta;

const NO_FIELDS = { range: undefined, area: undefined, targets: undefined, defence: undefined, duration: undefined };

/** Fireball in a 5th-rank slot: the damage has grown by two steps of +2d6. */
const FIREBALL: SpellDetailLine = {
  ...NO_FIELDS,
  id: spellId('fireball'),
  name: 'Fireball',
  rank: SpellRank.parse(5),
  cost: { kind: 'actions', cost: 'two', upTo: undefined },
  range: '500 feet',
  area: '20-foot burst',
  defence: 'basic Reflex',
  effects: [{ key: '0', text: '10d6 fire' }],
  targetValues: [],
  counteract: false,
  tags: [],
  variants: [],
};

/** Heal in a 3rd-rank slot, with the one- and two-action versions under their names. */
const HEAL: SpellDetailLine = {
  ...NO_FIELDS,
  id: spellId('heal'),
  name: 'Heal',
  rank: SpellRank.parse(3),
  cost: { kind: 'actions', cost: 'one', upTo: 'three' },
  targets: 'you or 1 willing creature',
  effects: [{ key: '0', text: '3d8 damage or healing' }],
  targetValues: [],
  counteract: false,
  tags: [],
  variants: [
    {
      ...NO_FIELDS,
      name: 'One action',
      cost: { kind: 'actions', cost: 'one', upTo: undefined },
      range: 'touch',
      effects: [{ key: '0', text: '3d8 damage or healing' }],
    },
    {
      ...NO_FIELDS,
      name: 'Two actions',
      cost: { kind: 'actions', cost: 'two', upTo: undefined },
      range: '30 feet',
      effects: [{ key: '0', text: '3d8 damage or healing' }],
    },
  ],
};

/** A spell that counteracts, cast with a Focus Point, with a duration and no damage. */
const DISPEL_MAGIC: SpellDetailLine = {
  ...NO_FIELDS,
  id: spellId('dispel-magic'),
  name: 'Dispel Magic',
  rank: SpellRank.parse(2),
  cost: { kind: 'actions', cost: 'two', upTo: undefined },
  range: '120 feet',
  targets: '1 creature or 1 object',
  duration: '10 minutes',
  effects: [],
  targetValues: [],
  counteract: true,
  tags: [SpellListMessage.TagSignature],
  variants: [],
};

export const Heightened: SpellDetailsStory = {
  args: { spell: FIREBALL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('10d6 fire')).toBeVisible();
    await expect(canvas.getByText('basic Reflex')).toBeVisible();
  },
};

export const Variants: SpellDetailsStory = {
  args: { spell: HEAL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('One action')).toBeVisible();
    await expect(canvas.getByText('30 feet')).toBeVisible();
  },
};

export const Counteracts: SpellDetailsStory = {
  args: { spell: DISPEL_MAGIC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Counteract')).toBeVisible();
    await expect(canvas.getByText('Signature')).toBeVisible();
  },
};
