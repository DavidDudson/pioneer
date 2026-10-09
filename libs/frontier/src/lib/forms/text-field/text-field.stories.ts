import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextField } from './text-field.component';

type TextFieldStory = StoryObj<TextField>;

/** A text input with label, hint and error. Bind it with `[formField]` in a signal form. */
const meta: Meta<TextField> = {
  title: 'Forms/Text Field',
  component: TextField,
  argTypes: { errors: { control: false } },
  args: { label: 'Name', value: '', placeholder: 'Valeros', disabled: false, hideLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-text-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Default: TextFieldStory = {};

export const WithHint: TextFieldStory = { args: { hint: 'Shown on the character sheet and to your party.' } };

export const WithError: TextFieldStory = { args: { error: 'Name is required.' } };

export const HiddenLabel: TextFieldStory = { args: { hideLabel: true } };

export const Disabled: TextFieldStory = { args: { value: 'Valeros', disabled: true } };
