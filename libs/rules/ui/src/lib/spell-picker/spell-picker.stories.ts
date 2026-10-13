import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import {
  AreaValue,
  CastActions,
  DefenseValue,
  DurationValue,
  MagicTradition,
  RangeBand,
  Rarity,
  TargetValue,
} from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { spellRow } from '../testing/spell-picker-fixtures';
import type { SpellPickerRow } from './spell-picker-row';
import { SpellPicker } from './spell-picker.component';

type SpellPickerStory = StoryObj<SpellPicker>;

const LONG_LIST = 300;

const SPELLS: readonly SpellPickerRow[] = [
  spellRow({
    id: 'electric-arc',
    name: 'Electric Arc',
    cantrip: true,
    heightenedTo: 3,
    traditions: [MagicTradition.Arcane, MagicTradition.Primal],
    cast: [CastActions.Two],
    targets: [TargetValue.Multiple],
    defense: [DefenseValue.Reflex],
    traits: ['Cantrip', 'Electricity'],
  }),
  spellRow({
    id: 'fireball',
    name: 'Fireball',
    rank: 3,
    traditions: [MagicTradition.Arcane, MagicTradition.Primal],
    range: [RangeBand.UpTo120],
    area: AreaValue.Burst,
    defense: [DefenseValue.Reflex],
    traits: ['Fire'],
  }),
  spellRow({
    id: 'heal',
    name: 'Heal',
    traditions: [MagicTradition.Divine, MagicTradition.Primal],
    cast: [CastActions.One, CastActions.Two, CastActions.Three],
    range: [RangeBand.Touch, RangeBand.UpTo30],
    traits: ['Healing', 'Vitality'],
  }),
  spellRow({
    id: 'hypnotic-pattern',
    name: 'Hypnotic Pattern',
    rank: 2,
    heightenedTo: 4,
    traditions: [MagicTradition.Arcane, MagicTradition.Occult],
    area: AreaValue.Burst,
    duration: [DurationValue.Sustained],
    defense: [DefenseValue.Will],
    traits: ['Incapacitation', 'Visual'],
    disabledReason: 'Already picked in this entry',
  }),
  spellRow({
    id: 'wish',
    name: 'Wish',
    rank: 10,
    rarity: Rarity.Rare,
    cast: [CastActions.Time],
    range: [RangeBand.None],
    targets: [TargetValue.None],
    duration: [DurationValue.Varies],
  }),
];

const meta: Meta<SpellPicker> = {
  title: 'Rules/Spell picker',
  component: SpellPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: SPELLS, ariaLabel: '3rd rank slot 1', disabled: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** Opens straight to the table. A spell already picked in the entry can't be taken again and says why. */
export const DisabledWithReason: SpellPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Already picked in this entry')).toHaveLength(1);
  },
};

/** A spell already picked is marked. */
export const Picked: SpellPickerStory = { args: { value: 'fireball' } };

/** The slot offers no spells. */
export const Empty: SpellPickerStory = { args: { rows: [] } };

/** A few hundred spells: only the rows in view are rendered. */
export const LongList: SpellPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      spellRow({ id: `spell-${index}`, name: `Spell ${index + 1}`, rank: (index % 9) + 1 }),
    ),
  },
};
