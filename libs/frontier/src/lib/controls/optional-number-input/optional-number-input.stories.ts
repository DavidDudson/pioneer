import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { OptionalNumberInput } from './optional-number-input.component';

type OptionalNumberInputStory = StoryObj<OptionalNumberInput>;

const meta: Meta<OptionalNumberInput> = {
  title: 'Controls/Optional Number Input',
  component: OptionalNumberInput,
  argTypes: {
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { ariaLabel: 'Highest level', placeholder: 'Any', disabled: false, invalid: false },
  render: (args) => ({
    props: args,
    template: `<fr-optional-number-input ${argsToTemplate(args)} />`,
  }),
};
export default meta;

/** No value: the box is empty and shows what that means. */
export const Empty: OptionalNumberInputStory = {};

export const WithValue: OptionalNumberInputStory = { args: { value: 3, min: 0, max: 20 } };

export const Disabled: OptionalNumberInputStory = { args: { value: 3, disabled: true } };
