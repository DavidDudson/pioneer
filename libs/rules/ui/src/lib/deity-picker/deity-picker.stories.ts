import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { RichText } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { deityRow } from '../testing/deity-picker-fixtures';
import type { DeityPickerRow } from './deity-picker-row';
import { DeityPicker } from './deity-picker.component';

type DeityPickerStory = StoryObj<DeityPicker>;

const LONG_LIST = 300;

const DEITIES: readonly DeityPickerRow[] = [
  deityRow({
    id: '',
    name: 'No deity',
    sanctification: undefined,
    fonts: [],
    domains: [],
    favoredWeapons: [],
    skills: [],
    description: RichText.parse([]),
    sources: [],
  }),
  deityRow({ id: 'sarenrae', name: 'Sarenrae', domains: ['fire', 'healing', 'sun', 'truth'] }),
  deityRow({
    id: 'zon-kuthon',
    name: 'Zon-Kuthon',
    sanctification: { modal: 'can', what: ['unholy'] },
    fonts: ['harm'],
    domains: ['darkness', 'pain'],
    favoredWeapons: ['Spiked chain'],
    skills: ['Intimidation'],
  }),
  deityRow({
    id: 'kalistrade',
    name: 'Prophecies of Kalistrade',
    sanctification: undefined,
    fonts: [],
    domains: [],
    favoredWeapons: [],
    skills: ['Society'],
    disabledReason: 'A cleric needs a deity with a divine font',
  }),
];

const meta: Meta<DeityPicker> = {
  title: 'Rules/Deity picker',
  component: DeityPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: DEITIES, ariaLabel: 'Deity', disabled: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** Opens straight to the table. A deity a cleric can't follow stays in it and says why. */
export const DisabledWithReason: DeityPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('A cleric needs a deity with a divine font')).toHaveLength(1);
  },
};

/** A deity already picked is marked. */
export const Picked: DeityPickerStory = { args: { value: 'sarenrae' } };

/** The slot offers no deities. */
export const Empty: DeityPickerStory = { args: { rows: [] } };

/** A few hundred deities: only the rows in view are rendered. */
export const LongList: DeityPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      deityRow({ id: `deity-${index}`, name: `Deity ${index + 1}` }),
    ),
  },
};
