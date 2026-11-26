import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Input } from './input.component';

type InputStory = StoryObj<Input>;

/** The one owner of the native `<input>`; Enter commits and Escape cancels, except while an IME composes. */
const meta: Meta<Input> = {
  title: 'Controls/Input',
  component: Input,
  argTypes: {
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
    typed: { action: 'typed' },
  },
  args: { type: 'text', value: '', placeholder: 'Character name', ariaLabel: 'Name', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-input ${argsToTemplate(args)} />`,
  }),
};

export default meta;

export const Text: InputStory = { args: { value: 'Valeros' } };

export const Search: InputStory = { args: { type: 'search', placeholder: 'Search', ariaLabel: 'Search' } };

export const Numeric: InputStory = {
  args: { type: 'number', value: '3', numeric: true, min: 0, max: 20, ariaLabel: 'Level' },
};

export const Calendar: InputStory = { args: { type: 'date', value: '2026-11-26', ariaLabel: 'Date' } };

export const Monospace: InputStory = {
  args: { value: 'max(1, floor(@actor.level / 2))', ariaLabel: 'Formula', monospace: true },
};

export const Invalid: InputStory = { args: { invalid: true } };

export const Disabled: InputStory = { args: { value: 'Valeros', disabled: true } };
