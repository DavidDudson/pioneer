import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { subclassRow } from '../testing/class-picker-fixtures';
import type { SubclassPickerRow } from './class-picker-row';
import { SubclassPicker } from './subclass-picker.component';

type SubclassPickerStory = StoryObj<SubclassPicker>;

const LONG_LIST = 300;

const SUBCLASSES: readonly SubclassPickerRow[] = [
  subclassRow({ id: 'grammatica', name: 'Ars Grammatica' }),
  subclassRow({ id: 'battle', name: 'Battle Magic', note: 'Trains Athletics again' }),
  subclassRow({ id: 'thesis', name: 'Thesis', disabledReason: 'Needs a higher level' }),
];

const meta: Meta<SubclassPicker> = {
  title: 'Rules/Subclass picker',
  component: SubclassPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: SUBCLASSES, ariaLabel: 'Subclass', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A subclass the character can't take yet stays in the table and says why. */
export const DisabledWithReason: SubclassPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs a higher level')).toHaveLength(1);
  },
};

/** A subclass already picked is marked. */
export const Picked: SubclassPickerStory = { args: { value: 'grammatica' } };

/** The content is still loading. */
export const Loading: SubclassPickerStory = { args: { rows: [], loading: true } };

/** The class has no subclass to offer. */
export const Empty: SubclassPickerStory = { args: { rows: [] } };

/** A few hundred subclasses: only the rows in view are rendered. */
export const LongList: SubclassPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      subclassRow({ id: `subclass-${index}`, name: `Subclass ${index + 1}` }),
    ),
  },
};
