import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, contentId, EntrySlug, PackId, SpellRank } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { WandBlock, WandCheckOutcome } from './wand-spells-line';
import type { WandLine } from './wand-spells-line';
import { WandSpellsView } from './wand-spells.component';

type WandSpellsStory = StoryObj<WandSpellsView>;

const FIREBALL = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('spell:fireball')));
const FIREBALL_RANK = SpellRank.parse(3);
const FIRE_DC = 10;
const ROLLED = 14;

const meta: Meta<WandSpellsView> = {
  title: 'Rules/Wand Spells',
  component: WandSpellsView,
};
export default meta;

/** A wand of Fireball with the day's cast unspent, held by a wizard who casts 3rd-rank spells. */
const FRESH: WandLine = {
  key: 'wand-1',
  name: 'Wand of Fireball (3rd rank)',
  id: FIREBALL,
  spell: 'Fireball',
  rank: FIREBALL_RANK,
  broken: false,
  blocked: undefined,
  use: { left: 1, max: 1 },
  castable: true,
  overchargeable: false,
  check: undefined,
};

export const Ready: WandSpellsStory = {
  args: { wands: [FRESH] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Wand of Fireball (3rd rank)')).toBeVisible();
    await expect(canvas.getByText('1 of 1 cast today')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Overcharge' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Cast' })).toBeEnabled();
  },
};

/** The day's cast is spent, so the wand can be overcharged. */
export const Spent: WandSpellsStory = {
  args: {
    wands: [{ ...FRESH, use: { left: 0, max: 1 }, castable: false, overchargeable: true }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Cast' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Overcharge' })).toBeEnabled();
  },
};

/** The flat check is rolled and passed: the player sees what it comes to before confirming. */
export const CheckPassed: WandSpellsStory = {
  args: {
    wands: [
      {
        ...FRESH,
        use: { left: 0, max: 1 },
        castable: false,
        check: { roll: ROLLED, dc: FIRE_DC, outcome: WandCheckOutcome.Broken },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Flat check: rolled 14 against DC 10.')).toBeVisible();
    await expect(canvas.getByText('Success: the spell is cast and the wand breaks.')).toBeVisible();
  },
};

/** The wand was overcharged already today, so it is destroyed without a roll. */
export const CheckRepeated: WandSpellsStory = {
  args: {
    wands: [
      {
        ...FRESH,
        use: { left: 0, max: 1 },
        castable: false,
        check: { roll: undefined, dc: FIRE_DC, outcome: WandCheckOutcome.Repeated },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Already overcharged today: the wand is destroyed and the spell is not cast.'),
    ).toBeVisible();
  },
};

/** A broken wand can't be cast; it offers to be marked repaired. */
export const Broken: WandSpellsStory = {
  args: { wands: [{ ...FRESH, broken: true, castable: false }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Broken')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Mark repaired' })).toBeEnabled();
  },
};

/** A wand whose spell is on none of the holder's lists is shown with the reason. */
export const Unavailable: WandSpellsStory = {
  args: { wands: [{ ...FRESH, blocked: WandBlock.NotOnList, castable: false }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not on any of your spell lists')).toBeVisible();
  },
};
