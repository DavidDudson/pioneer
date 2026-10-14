import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { HitPoints } from '@pioneer/rules/sdk';
import { expect, waitFor, within } from 'storybook/test';

import { classRow } from '../testing/class-picker-fixtures';
import type { ClassPickerRow } from './class-picker-row';
import { ClassPicker } from './class-picker.component';

type ClassPickerStory = StoryObj<ClassPicker>;

const LONG_LIST = 300;
const FIGHTER_HIT_POINTS = HitPoints.parse(10);

const CLASSES: readonly ClassPickerRow[] = [
  classRow({ id: 'wizard', name: 'Wizard' }),
  classRow({
    id: 'fighter',
    name: 'Fighter',
    keyAttribute: ['str', 'dex'],
    hitPoints: FIGHTER_HIT_POINTS,
    skills: ['Athletics'],
    additionalSkills: 3,
    traditions: [],
    proficiencies: ['Perception: Expert', 'Fortitude: Expert'],
    note: 'Trains Athletics again',
  }),
  classRow({ id: 'kineticist', name: 'Kineticist', disabledReason: 'Needs the Rage of Elements pack' }),
];

const meta: Meta<ClassPicker> = {
  title: 'Rules/Class picker',
  component: ClassPicker,
  argTypes: {
    rows: { control: false },
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { rows: CLASSES, ariaLabel: 'Class', disabled: false, loading: false },
  parameters: { layout: 'padded' },
};
export default meta;

/** A class the content pack lacks stays in the table and says why it can't be picked. */
export const DisabledWithReason: ClassPickerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs the Rage of Elements pack')).toHaveLength(1);
  },
};

/** A class already picked is marked. */
export const Picked: ClassPickerStory = { args: { value: 'wizard' } };

/** The content is still loading. */
export const Loading: ClassPickerStory = { args: { rows: [], loading: true } };

/** No class is loaded. */
export const Empty: ClassPickerStory = { args: { rows: [] } };

/** A few hundred classes: only the rows in view are rendered. */
export const LongList: ClassPickerStory = {
  args: {
    rows: Array.from({ length: LONG_LIST }, (_entry, index) =>
      classRow({ id: `class-${index}`, name: `Class ${index + 1}` }),
    ),
  },
};
