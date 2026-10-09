import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { ToggleButtonField } from './toggle-button-field.component';

type ToggleButtonFieldStory = StoryObj<ToggleButtonField>;

/** An on/off setting with hint and error. The label is the button's text. Bind it with `[formField]`. */
const meta: Meta<ToggleButtonField> = {
  title: 'Forms/Toggle Button Field',
  component: ToggleButtonField,
  argTypes: { errors: { control: false }, hideLabel: { control: false } },
  args: { label: 'Share with party', value: false, disabled: false },
  render: (args) => ({
    props: args,
    template: `<fr-toggle-button-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Off: ToggleButtonFieldStory = {};

export const On: ToggleButtonFieldStory = { args: { value: true } };

export const WithHint: ToggleButtonFieldStory = { args: { hint: 'Visible to everyone in the campaign.' } };

export const WithError: ToggleButtonFieldStory = { args: { error: 'Share the character before inviting.' } };

export const Disabled: ToggleButtonFieldStory = { args: { value: true, disabled: true } };
