import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { NumberInput } from './number-input.component';

type NumberInputStory = StoryObj<NumberInput>;

const meta: Meta<NumberInput> = {
  title: 'Controls/Number Input',
  component: NumberInput,
  argTypes: {
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { value: 3, placeholder: 'Any', ariaLabel: 'Level', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-number-input ${argsToTemplate(args)} />`,
  }),
};

export default meta;

export const Default: NumberInputStory = {};

export const Bounded: NumberInputStory = { args: { min: 1, max: 20 } };

export const Invalid: NumberInputStory = { args: { value: 25, min: 1, max: 20, invalid: true } };

export const Disabled: NumberInputStory = { args: { disabled: true } };

/** No value: the box is empty and shows what that means (an open bound). */
export const Optional: NumberInputStory = { args: { value: undefined, optional: true } };

/** Minus and plus buttons at the ends, for touch. */
export const WithSteppers: NumberInputStory = { args: { min: 0, max: 20, steppers: true } };

export const Fractional: NumberInputStory = { args: { value: 0.5, step: 0.1, steppers: true } };
