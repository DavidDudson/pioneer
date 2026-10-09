import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';

import { DateField } from './date-field.component';

type DateFieldStory = StoryObj<DateField>;

const meta: Meta<DateField> = {
  title: 'Forms/Date Field',
  component: DateField,
  argTypes: { value: { control: false }, errors: { control: false } },
  args: { label: 'Next session', disabled: false, hideLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-date-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: DateFieldStory = {};

export const Filled: DateFieldStory = { args: { value: Temporal.PlainDate.from('2026-10-14') } };

export const WithHint: DateFieldStory = { args: { hint: 'Your party sees this on the campaign page.' } };

export const WithError: DateFieldStory = { args: { error: 'Pick a date in the future.' } };
