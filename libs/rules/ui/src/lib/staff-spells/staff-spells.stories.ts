import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId, SpellRank, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { StaffSpellBlock } from './staff-spells-line';
import { StaffSpellsView } from './staff-spells.component';

type StaffSpellsStory = StoryObj<StaffSpellsView>;

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const meta: Meta<StaffSpellsView> = {
  title: 'Rules/Staff Spells',
  component: StaffSpellsView,
};
export default meta;

/** A prepared staff of fire held by a wizard who casts up to 2nd rank. */
export const Prepared: StaffSpellsStory = {
  args: {
    staves: [
      {
        key: 'staff-of-fire',
        name: 'Staff of Fire',
        charges: { left: 3, max: 4 },
        spells: [
          {
            key: 'produce-flame',
            id: spellId('produce-flame'),
            name: 'Produce Flame',
            rank: STAFF_CANTRIP,
            charges: 0,
            blocked: undefined,
            options: [{ slot: undefined, charges: 0, slotRank: undefined }],
            heightenedTo: SpellRank.parse(1),
          },
          {
            key: 'burning-hands',
            id: spellId('burning-hands'),
            name: 'Burning Hands',
            rank: SpellRank.parse(1),
            charges: 1,
            blocked: undefined,
            options: [{ slot: undefined, charges: 1, slotRank: undefined }],
            heightenedTo: undefined,
          },
          {
            key: 'fireball',
            id: spellId('fireball'),
            name: 'Fireball',
            rank: SpellRank.parse(3),
            charges: 3,
            blocked: StaffSpellBlock.RankTooHigh,
            options: [],
            heightenedTo: undefined,
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Staff of Fire')).toBeVisible();
    await expect(canvas.getByText('3 of 4 charges')).toBeVisible();
    await expect(canvas.getByText('Cantrip, no charges')).toBeVisible();
    await expect(canvas.getByText('You cast no spell of 3rd rank yet')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cast, 1 charge' })).toBeVisible();
  },
};

/** A spontaneous caster picks between paying the rank in charges and paying 1 charge with a slot. */
export const CostPicker: StaffSpellsStory = {
  args: {
    staves: [
      {
        key: 'staff-of-fire',
        name: 'Staff of Fire',
        charges: { left: 4, max: 4 },
        spells: [
          {
            key: 'fireball',
            id: spellId('fireball'),
            name: 'Fireball',
            rank: SpellRank.parse(3),
            charges: 3,
            blocked: undefined,
            options: [
              { slot: undefined, charges: 3, slotRank: undefined },
              { slot: 'sorcerer:3', charges: 1, slotRank: SpellRank.parse(3) },
              { slot: 'sorcerer:4', charges: 1, slotRank: SpellRank.parse(4) },
            ],
            heightenedTo: undefined,
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Cast, 3 charges' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cast, 1 charge and a 4th-rank slot' })).toBeVisible();
  },
};

/** A staff held by someone whose spell lists have none of its spells, and that was not prepared today. */
export const Unavailable: StaffSpellsStory = {
  args: {
    staves: [
      {
        key: 'staff-of-healing',
        name: 'Staff of Healing',
        charges: undefined,
        spells: [
          {
            key: 'heal',
            id: spellId('heal'),
            name: 'Heal',
            rank: SpellRank.parse(1),
            charges: 1,
            blocked: StaffSpellBlock.NotOnList,
            options: [],
            heightenedTo: undefined,
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not prepared today')).toBeVisible();
    await expect(canvas.getByText('Not on any of your spell lists')).toBeVisible();
  },
};
