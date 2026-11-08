import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import {
  ActionCost,
  ContentId,
  contentId,
  DamageFormula,
  EntrySlug,
  InlineKind,
  PackId,
  SpellRank,
} from '@pioneer/rules/sdk';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ActionUser } from '../actions/action-user';
import type { UsableLine } from '../actions/action-user';
import { INLINE_ROLLER } from '../rich-text/inline-roller';
import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import { SpellListMessage } from '../spell-list/spell-list-messages';
import { SpellRow } from './spell-row.component';

type SpellRowStory = StoryObj<SpellRow>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const NO_FIELDS = { range: undefined, area: undefined, targets: undefined, defence: undefined, duration: undefined };

const FIREBALL: SpellDetailLine = {
  ...NO_FIELDS,
  id: spellId('fireball'),
  name: 'Fireball',
  rank: SpellRank.parse(3),
  cost: { kind: 'actions', cost: 'two', upTo: undefined },
  range: '500 feet',
  area: '20-foot burst',
  defence: 'basic Reflex',
  effects: [
    {
      key: '0',
      text: '6d6 fire',
      roll: { type: InlineKind.Damage, instances: [{ formula: DamageFormula.parse('6d6') }] },
    },
  ],
  targetValues: [],
  counteract: false,
  tags: [],
  traits: [{ label: 'Concentrate' }, { label: 'Fire' }, { label: 'Manipulate' }],
  source: 'Sorcerer Spellcasting',
  variants: [],
};

const CAST: UsableLine = { id: spellId('fireball'), name: 'Fireball', cost: ActionCost.Two, affordable: true };

const roll = fn();

const meta: Meta<SpellRow> = {
  title: 'Rules/Spell Row',
  component: SpellRow,
  decorators: [
    applicationConfig({
      providers: [
        { provide: ActionUser, useValue: { use: fn() } },
        {
          provide: INLINE_ROLLER,
          useValue: { hasStatistic: () => false, check: fn(), damage: roll },
        },
      ],
    }),
  ],
};
export default meta;

/** Name, dice and cast on the first row; rank and traits, and the source, on the second. */
export const Damaging: SpellRowStory = {
  args: { spell: FIREBALL, use: CAST },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Fireball')).toBeVisible();
    await expect(canvas.getByText('Sorcerer Spellcasting')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Roll 6d6 fire' }));
    await expect(roll).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('button', { name: 'Use' })).toBeVisible();
  },
};

/** A cantrip says so in place of a rank, and one with no damage has no dice button. */
export const Cantrip: SpellRowStory = {
  args: {
    spell: {
      ...FIREBALL,
      name: 'Shield',
      effects: [],
      tags: [SpellListMessage.TagCantrip],
      traits: [{ label: 'Abjuration' }],
      source: undefined,
    },
    use: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Cantrip')).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
