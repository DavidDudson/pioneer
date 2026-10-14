import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Attribute } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { keyAttributeRow } from '../testing/class-picker-fixtures';
import type { KeyAttributePickerRow } from './class-picker-row';
import { KeyAttributePicker } from './key-attribute-picker.component';

type KeyAttributePickerStory = StoryObj<KeyAttributePicker>;

const ATTRIBUTES: readonly KeyAttributePickerRow[] = [
  keyAttributeRow(Attribute.Strength, 'Strength', 3),
  keyAttributeRow(Attribute.Dexterity, 'Dexterity', 1),
  { ...keyAttributeRow(Attribute.Charisma, 'Charisma', -1), disabledReason: 'The class does not allow it' },
];

const meta: Meta<KeyAttributePicker> = {
  title: 'Rules/Key attribute picker',
  component: KeyAttributePicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: ATTRIBUTES, ariaLabel: 'Key attribute', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** An attribute the class doesn't allow stays in the table and says why. */
export const DisabledWithReason: KeyAttributePickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('The class does not allow it')).toHaveLength(1);
  },
};

/** An attribute already picked is marked. */
export const Picked: KeyAttributePickerStory = { args: { value: 'str' } };

/** The character is still loading. */
export const Loading: KeyAttributePickerStory = { args: { rows: [], loading: true } };

/** The class allows no choice. */
export const Empty: KeyAttributePickerStory = { args: { rows: [] } };
