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
  args: { value: 3, ariaLabel: 'Level', disabled: false, invalid: false },
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
