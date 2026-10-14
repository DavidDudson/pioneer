import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Attribute } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { attributeRow } from '../testing/slot-picker-fixtures';
import { AttributePicker } from './attribute-picker.component';
import type { AttributePickerRow } from './slot-picker-row';

type AttributePickerStory = StoryObj<AttributePicker>;

const ATTRIBUTES: readonly AttributePickerRow[] = [
  attributeRow({ id: Attribute.Strength, name: 'Strength', modifier: 4, boosted: 5 }),
  attributeRow({ id: Attribute.Dexterity, name: 'Dexterity', modifier: 2, boosted: 3 }),
  attributeRow({ id: Attribute.Constitution, name: 'Constitution', modifier: 2, boosted: 3 }),
  attributeRow({ id: Attribute.Intelligence, name: 'Intelligence', modifier: 0, boosted: 1 }),
  attributeRow({
    id: Attribute.Wisdom,
    name: 'Wisdom',
    modifier: 1,
    boosted: 2,
    disabledReason: 'Boosted already at this level',
  }),
  attributeRow({ id: Attribute.Charisma, name: 'Charisma', modifier: -1, boosted: 0 }),
];

const meta: Meta<AttributePicker> = {
  title: 'Rules/Attribute picker',
  component: AttributePicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: ATTRIBUTES, ariaLabel: 'Boost', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** An attribute the slot can't offer stays in the table and says why. */
export const DisabledWithReason: AttributePickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Boosted already at this level')).toHaveLength(1);
  },
};

/** An attribute already picked is marked. */
export const Picked: AttributePickerStory = { args: { value: Attribute.Strength } };

/** A long list, searched and scrolled. */
export const LongList: AttributePickerStory = {
  args: {
    rows: Array.from({ length: 120 }, (_unused, index) =>
      attributeRow({ id: Attribute.Strength, name: `Attribute ${index}` }),
    ),
  },
};

/** The content is still loading. */
export const Loading: AttributePickerStory = { args: { rows: [], loading: true } };

/** The slot offers no attribute. */
export const Empty: AttributePickerStory = { args: { rows: [] } };
