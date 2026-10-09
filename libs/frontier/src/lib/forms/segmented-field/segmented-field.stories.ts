import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../../controls/select/select.component';
import { SegmentedField } from './segmented-field.component';

type Hand = 'one' | 'two';

type SegmentedFieldStory = StoryObj<SegmentedField<Hand>>;

const HANDS: readonly SelectOption<Hand>[] = [
  { value: 'one', label: 'One hand' },
  { value: 'two', label: 'Two hands' },
];

const meta: Meta<SegmentedField<Hand>> = {
  title: 'Forms/Segmented Field',
  component: SegmentedField,
  argTypes: { errors: { control: false } },
  args: { label: 'Grip', options: HANDS, disabled: false, hideLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-segmented-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: SegmentedFieldStory = {};

export const Selected: SegmentedFieldStory = { args: { value: 'two' } };

export const WithHint: SegmentedFieldStory = { args: { hint: 'Two-handed adds the weapon’s two-hand damage die.' } };

export const WithError: SegmentedFieldStory = { args: { error: 'Choose a grip.' } };
