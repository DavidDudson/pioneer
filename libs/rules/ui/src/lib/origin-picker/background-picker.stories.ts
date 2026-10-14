import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';

import { backgroundRow } from '../testing/origin-picker-fixtures';
import { BackgroundPicker } from './background-picker.component';
import type { BackgroundPickerRow } from './origin-picker-row';

type BackgroundPickerStory = StoryObj<BackgroundPicker>;

const LONG_LIST = 300;

const BACKGROUNDS: readonly BackgroundPickerRow[] = [
  backgroundRow({
    id: 'barkeep',
    name: 'Barkeep',
    skills: ['Diplomacy'],
    lores: ['Alcohol Lore'],
    feats: ['Hobnobber'],
  }),
  backgroundRow({ id: 'scholar', name: 'Scholar' }),
  backgroundRow({
    id: 'hermit',
    name: 'Hermit',
    disabledReason: 'Needs a pack that is not enabled for this character',
  }),
];

const meta: Meta<BackgroundPicker> = {
  title: 'Rules/Background picker',
  component: BackgroundPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: BACKGROUNDS, ariaLabel: 'Background', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A background the character can't take stays in the table and says why. */
export const DisabledWithReason: BackgroundPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs a pack that is not enabled for this character')).toHaveLength(1);
  },
};

/** A background already picked is marked. */
export const Picked: BackgroundPickerStory = { args: { value: 'scholar' } };

/** The content is still loading. */
export const Loading: BackgroundPickerStory = { args: { rows: [], loading: true } };

/** No background is loaded. */
export const Empty: BackgroundPickerStory = { args: { rows: [] } };

/** A few hundred backgrounds: only the rows in view are rendered. */
export const LongList: BackgroundPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      backgroundRow({ id: `background-${index}`, name: `Background ${index + 1}` }),
    ),
  },
};
