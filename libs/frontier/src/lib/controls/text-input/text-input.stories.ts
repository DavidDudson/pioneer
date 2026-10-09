import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextInput } from './text-input.component';

type TextInputStory = StoryObj<TextInput>;

/** A plain control: just the value widget. Enter commits, Escape cancels. Use it in `fr-inline-field`. */
const meta: Meta<TextInput> = {
  title: 'Controls/Text Input',
  component: TextInput,
  argTypes: {
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { value: '', placeholder: 'Character name', ariaLabel: 'Name', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-text-input ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: TextInputStory = {};

export const Filled: TextInputStory = { args: { value: 'Valeros' } };

export const Monospace: TextInputStory = {
  args: { value: 'max(1, floor(@actor.level / 2))', ariaLabel: 'Formula', monospace: true },
};

export const Invalid: TextInputStory = { args: { value: '', invalid: true } };

export const Disabled: TextInputStory = { args: { value: 'Valeros', disabled: true } };
