import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { SLOT_FACTS, slotRow } from '../testing/slot-picker-fixtures';
import type { SlotPickerRow } from './slot-picker-row';
import { SlotPicker } from './slot-picker.component';

type SlotPickerStory = StoryObj<SlotPicker>;

const OPTIONS: readonly SlotPickerRow[] = [
  slotRow({ id: 'fire', name: 'Fire' }),
  slotRow({ id: 'water', name: 'Water' }),
  slotRow({ id: 'void', name: 'Void', disabledReason: 'Not in the loaded packs' }),
];

const meta: Meta<SlotPicker> = {
  title: 'Rules/Slot picker',
  component: SlotPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: OPTIONS, ariaLabel: 'Choice', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** An option without row data is a name and a source; one the slot can't take says why. */
export const DisabledWithReason: SlotPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Not in the loaded packs')).toHaveLength(1);
  },
};

/** An option already picked is marked. */
export const Picked: SlotPickerStory = { args: { value: 'water' } };

/** A long list, searched and scrolled. */
export const LongList: SlotPickerStory = {
  args: {
    rows: Array.from({ length: 120 }, (_unused, index) => slotRow({ id: `o${index}`, name: `Option ${index}` })),
  },
};

/** The content is still loading. */
export const Loading: SlotPickerStory = { args: { rows: [], loading: true } };

/** The slot offers nothing. */
export const Empty: SlotPickerStory = { args: { rows: [] } };

/** Options that name a content entry show its level, rarity, traits and summary; the one without an entry shows its name. */
export const EntryFacts: SlotPickerStory = {
  args: {
    rows: [
      slotRow({ id: 'ember', name: 'Ember', facts: SLOT_FACTS }),
      slotRow({ id: 'frost', name: 'Frost', facts: { ...SLOT_FACTS, level: 1, traits: ['Cold'] } }),
      slotRow({ id: 'plain', name: 'Plain', sources: [] }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Burns what it touches.')).not.toHaveLength(0);
  },
};
