import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { heritageRow } from '../testing/origin-picker-fixtures';
import { HeritagePicker } from './heritage-picker.component';
import type { HeritagePickerRow } from './origin-picker-row';

type HeritagePickerStory = StoryObj<HeritagePicker>;

const LONG_LIST = 300;

const HERITAGES: readonly HeritagePickerRow[] = [
  heritageRow({ id: 'woodland', name: 'Woodland Elf' }),
  heritageRow({ id: 'changeling', name: 'Changeling', ancestry: undefined, grants: ['Slag May'] }),
  heritageRow({ id: 'cavern', name: 'Cavern Elf', disabledReason: 'Needs the Elf ancestry' }),
];

const meta: Meta<HeritagePicker> = {
  title: 'Rules/Heritage picker',
  component: HeritagePicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: HERITAGES, ariaLabel: 'Heritage', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A heritage of another ancestry stays in the table and says why it can't be picked. */
export const DisabledWithReason: HeritagePickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs the Elf ancestry')).toHaveLength(1);
  },
};

/** A heritage already picked is marked. */
export const Picked: HeritagePickerStory = { args: { value: 'woodland' } };

/** The content is still loading. */
export const Loading: HeritagePickerStory = { args: { rows: [], loading: true } };

/** The ancestry has no heritage. */
export const Empty: HeritagePickerStory = { args: { rows: [] } };

/** A few hundred heritages: only the rows in view are rendered. */
export const LongList: HeritagePickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      heritageRow({ id: `heritage-${index}`, name: `Heritage ${index + 1}` }),
    ),
  },
};
