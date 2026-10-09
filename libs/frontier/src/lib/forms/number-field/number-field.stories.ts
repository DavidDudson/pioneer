import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { NumberField } from './number-field.component';

type NumberFieldStory = StoryObj<NumberField>;

const meta: Meta<NumberField> = {
  title: 'Forms/Number Field',
  component: NumberField,
  argTypes: { errors: { control: false } },
  args: { label: 'Level', value: 1, min: 1, max: 20, disabled: false, hideLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-number-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Default: NumberFieldStory = {};

export const WithHint: NumberFieldStory = { args: { hint: 'From 1 to 20.' } };

export const WithError: NumberFieldStory = { args: { value: 25, error: 'Level must be 20 or less.' } };

export const Disabled: NumberFieldStory = { args: { disabled: true } };
