import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { CountMeter } from './count-meter.component';

type CountStory = StoryObj<CountMeter>;

const meta: Meta<CountMeter> = {
  title: 'Rules/Picker cells/Count meter',
  component: CountMeter,
  args: { value: 2, max: 4, label: 'Slots used' },
};
export default meta;

/** Two of four. */
export const Partial: CountStory = {};

/** All used. */
export const Full: CountStory = { args: { value: 4 } };

/** None used. */
export const Empty: CountStory = { args: { value: 0 } };
