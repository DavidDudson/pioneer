import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Feet, HitPoints } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { ancestryRow } from '../testing/origin-picker-fixtures';
import { AncestryPicker } from './ancestry-picker.component';
import type { AncestryPickerRow } from './origin-picker-row';

type AncestryPickerStory = StoryObj<AncestryPicker>;

const LONG_LIST = 300;

const ANCESTRIES: readonly AncestryPickerRow[] = [
  ancestryRow({
    id: 'dwarf',
    name: 'Dwarf',
    hitPoints: HitPoints.parse(10),
    speed: Feet.parse(20),
    boosts: [['con'], ['wis'], ['str', 'dex', 'con', 'int', 'wis', 'cha']],
    flaws: ['cha'],
    languages: ['Common', 'Dwarven'],
    traits: ['Dwarf', 'Humanoid'],
  }),
  ancestryRow({ id: 'elf', name: 'Elf' }),
  ancestryRow({
    id: 'kitsune',
    name: 'Kitsune',
    disabledReason: 'Needs a pack that is not enabled for this character',
  }),
];

const meta: Meta<AncestryPicker> = {
  title: 'Rules/Ancestry picker',
  component: AncestryPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: ANCESTRIES, ariaLabel: 'Ancestry', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** Opens straight to the table. An ancestry the character can't take stays in it and says why. */
export const DisabledWithReason: AncestryPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs a pack that is not enabled for this character')).toHaveLength(1);
  },
};

/** An ancestry already picked is marked. */
export const Picked: AncestryPickerStory = { args: { value: 'elf' } };

/** The content is still loading: skeleton rows stand in for the ancestries. */
export const Loading: AncestryPickerStory = { args: { rows: [], loading: true } };

/** No ancestry is loaded. */
export const Empty: AncestryPickerStory = { args: { rows: [] } };

/** A few hundred ancestries: only the rows in view are rendered. */
export const LongList: AncestryPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      ancestryRow({ id: `ancestry-${index}`, name: `Ancestry ${index + 1}` }),
    ),
  },
};
