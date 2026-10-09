import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextAreaField } from './text-area-field.component';

type TextAreaFieldStory = StoryObj<TextAreaField>;

/** A text area with label, hint and error. Bind it with `[formField]` in a signal form. */
const meta: Meta<TextAreaField> = {
  title: 'Forms/Text Area Field',
  component: TextAreaField,
  argTypes: { errors: { control: false } },
  args: {
    label: 'Notes',
    value: '',
    placeholder: 'Debts, grudges, rumours',
    rows: 6,
    monospace: false,
    disabled: false,
    hideLabel: false,
  },
  render: (args) => ({
    props: args,
    template: `<fr-text-area-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Default: TextAreaFieldStory = {};

export const Filled: TextAreaFieldStory = { args: { value: 'Owes the innkeeper 5 gp.\nAvoid the north road.' } };

export const WithHint: TextAreaFieldStory = { args: { hint: 'Only you can see these.' } };

export const WithError: TextAreaFieldStory = { args: { error: 'Notes are too long.' } };

export const Monospace: TextAreaFieldStory = {
  args: { label: 'Predicate', value: '[\n  "self:condition:frightened"\n]', placeholder: '', monospace: true },
};

export const Disabled: TextAreaFieldStory = { args: { value: 'Owes the innkeeper 5 gp.', disabled: true } };
