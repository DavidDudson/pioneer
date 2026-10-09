import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';

import { DateInput } from './date-input.component';

type DateInputStory = StoryObj<DateInput>;

const meta: Meta<DateInput> = {
  title: 'Controls/Date Input',
  component: DateInput,
  argTypes: {
    value: { control: false },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { ariaLabel: 'Session date', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-date-input ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: DateInputStory = {};

export const Filled: DateInputStory = { args: { value: Temporal.PlainDate.from('2026-10-07') } };

export const Disabled: DateInputStory = { args: { value: Temporal.PlainDate.from('2026-10-07'), disabled: true } };
